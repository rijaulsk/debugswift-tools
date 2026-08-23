import { NextResponse } from "next/server";
import { runDeepChecks, safeHostname, type DeepChecks } from "@/lib/audit/deep";
import { clientKey, rateLimit } from "@/lib/rateLimit";

/* The deeper checks endpoint — Google, Mozilla and the domain registry.
 *
 * Separate from /api/audit on purpose. That route is fast and involves one
 * fetch from our server; this one is slow and hands the address to three other
 * companies, so it is a thing the visitor asks for rather than a thing that
 * happens to them. See the header of lib/audit/deep.ts. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Google can genuinely take half a minute. Next's default would cut that off
 * and report a failure that is ours rather than theirs — so this is declared,
 * not inherited. The audit route needs no such declaration because its own
 * 10s abort always fires first (verified in production). */
export const maxDuration = 90;

/* Tighter than the audit's twelve, and for a different reason. The audit's
 * limit is about how hard one person can point our server at someone else's.
 * This one is about a shared, finite allowance: PageSpeed's quota belongs to
 * the deployment's key, not to the caller, so one enthusiastic visitor spends
 * everybody's. Six in ten minutes is enough to check a site and its staging
 * copy, and not enough to drain a day's quota. */
const LIMIT = { limit: 6, windowMs: 10 * 60 * 1000 };

type DeepError = { error: string; hint?: string };

export async function POST(request: Request) {
  const gate = rateLimit(`deep:${clientKey(request)}`, LIMIT);
  if (!gate.ok) {
    return json<DeepError>(
      {
        error: "That's a lot of deep checks in a short window.",
        hint: `These use other companies' allowances as well as ours. Try again in about ${Math.ceil(gate.retryAfterSeconds / 60)} minutes.`,
      },
      429,
      { "retry-after": String(gate.retryAfterSeconds) },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json<DeepError>({ error: "We couldn't read that request." }, 400);
  }

  const { host } = (body ?? {}) as { host?: unknown };
  if (typeof host !== "string") {
    return json<DeepError>({ error: "No address to check." }, 400);
  }

  const clean = safeHostname(host);
  if (!clean) {
    return json<DeepError>({ error: "That doesn't look like a web address." }, 422);
  }

  try {
    const result = await runDeepChecks(clean, process.env.PAGESPEED_API_KEY);
    return json<DeepChecks>(result, 200);
  } catch (error) {
    /* Each fetcher already resolves to its own failure object, so reaching here
     * means something broke in our orchestration rather than at a third party.
     * Say so, and don't dress it up as their outage. */
    console.error("[deep] unexpected failure", error);
    return json<DeepError>(
      {
        error: "Something went wrong at our end while running the deeper checks.",
        hint: "That's our bug, not your site.",
      },
      500,
    );
  }
}

function json<T>(data: T, status: number, headers?: Record<string, string>) {
  return NextResponse.json(data, { status, headers });
}
