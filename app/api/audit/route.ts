import { NextResponse } from "next/server";
import { auditPage } from "@/lib/audit/checks";
import { FetchPageError } from "@/lib/audit/fetchPage";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import type { AuditError, AuditResult } from "@/lib/audit/types";

/* node:dns and Buffer are both used down the call chain (lib/audit/fetchPage.ts
 * validates resolved addresses before every request), so this cannot run on the
 * edge runtime. Stated explicitly rather than relied on as a default. */
export const runtime = "nodejs";
/* The result describes another site at a moment in time. Caching it would mean
 * showing someone a stale audit of a page they just changed. */
export const dynamic = "force-dynamic";

/* Twelve audits per ten minutes per client. Each one makes up to three outbound
 * requests to a host the caller named, so this is the cap on how hard one person
 * can point this server at someone else's. See lib/rateLimit.ts for what this
 * limiter is and is not. */
const LIMIT = { limit: 12, windowMs: 10 * 60 * 1000 };

export async function POST(request: Request) {
  const gate = rateLimit(clientKey(request), LIMIT);
  if (!gate.ok) {
    return json<AuditError>(
      {
        error: "That's a lot of audits in a short window.",
        hint: `Try again in about ${Math.ceil(gate.retryAfterSeconds / 60)} minutes.`,
      },
      429,
      { "retry-after": String(gate.retryAfterSeconds) },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json<AuditError>({ error: "We couldn't read that request." }, 400);
  }

  const { url, botcheck } = (body ?? {}) as { url?: unknown; botcheck?: unknown };

  /* Honeypot. Named "botcheck" and NOT "website": Chrome's autofill fills a
   * field called "website" even with autoComplete="off", which turns the trap
   * into a trap for real people. That exact bug cost the main site real leads —
   * see the note in E:\debugswift's DiagnosisForm.
   *
   * Answering 200 with a plausible-looking refusal, rather than an error, keeps
   * a script from learning which field gave it away. */
  if (typeof botcheck === "string" && botcheck.trim() !== "") {
    return json<AuditError>({ error: "We couldn't check that address." }, 200);
  }

  if (typeof url !== "string") {
    return json<AuditError>({ error: "Enter a web address to check." }, 400);
  }

  try {
    const result = await auditPage(url);
    return json<AuditResult>(result, 200);
  } catch (err) {
    /* FetchPageError carries a message written for the person who typed the
     * address. Anything else is ours, and gets a generic message — an internal
     * error string could describe our own network. */
    if (err instanceof FetchPageError) {
      /* 422, not 200: the request was well-formed but the thing it named could
       * not be audited. The client reads the body on every status, so this
       * stays a readable message rather than becoming a generic network error
       * — but it must not be logged or measured as a success. */
      return json<AuditError>({ error: err.message, hint: err.hint }, 422);
    }
    console.error("[audit] unexpected failure", err);
    return json<AuditError>(
      {
        error: "Something went wrong at our end while checking that page.",
        hint: "That's our bug, not your site. Worth trying again in a moment.",
      },
      500,
    );
  }
}

function json<T>(data: T, status: number, headers?: Record<string, string>) {
  return NextResponse.json(data, { status, headers });
}
