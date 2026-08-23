import { NextResponse } from "next/server";
import { safeHostname } from "@/lib/audit/deep";
import { checkEmail, type EmailReport } from "@/lib/email/checks";
import { clientKey, rateLimit } from "@/lib/rateLimit";

/* The email deliverability endpoint — SPF, DKIM, DMARC and MX.
 *
 * node:dns, so nodejs runtime rather than edge. Nothing here fetches a URL the
 * caller chose: every lookup is a DNS query for a name derived from a validated
 * hostname, so there is no SSRF surface of the kind lib/audit/fetchPage.ts
 * guards. The hostname is still validated, because it is concatenated into
 * names like `_dmarc.<host>` and a hostname is not a free-text field. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* One check is a couple of dozen DNS queries — twelve DKIM selector probes plus
 * however deep the SPF include tree goes. Individually cheap, collectively
 * worth a limit, and the public resolvers we query have their own opinion about
 * being hammered. */
const LIMIT = { limit: 10, windowMs: 10 * 60 * 1000 };

type EmailError = { error: string; hint?: string };

export async function POST(request: Request) {
  const gate = rateLimit(`email:${clientKey(request)}`, LIMIT);
  if (!gate.ok) {
    return json<EmailError>(
      {
        error: "That's a lot of domains in a short window.",
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
    return json<EmailError>({ error: "We couldn't read that request." }, 400);
  }

  const { domain, botcheck } = (body ?? {}) as { domain?: unknown; botcheck?: unknown };

  /* Same honeypot as the audit, same name, same reasoning: NOT "website",
   * because Chrome autofills a field called that even with autoComplete off. */
  if (typeof botcheck === "string" && botcheck.trim() !== "") {
    return json<EmailError>({ error: "We couldn't check that domain." }, 200);
  }

  if (typeof domain !== "string") {
    return json<EmailError>({ error: "Enter a domain to check." }, 400);
  }

  /* People will paste an email address, because the tool is about email. Take
   * the domain off it rather than refusing — the intent is unambiguous. */
  const raw = domain.includes("@") ? domain.slice(domain.lastIndexOf("@") + 1) : domain;
  const clean = safeHostname(raw.replace(/^https?:\/\//i, "").split("/")[0] ?? "");

  if (!clean) {
    return json<EmailError>(
      {
        error: "That doesn't look like a domain.",
        hint: "Just the domain on its own — example.com — or an email address at it.",
      },
      422,
    );
  }

  try {
    const report = await checkEmail(clean);
    return json<EmailReport>(report, 200);
  } catch (error) {
    console.error("[email] unexpected failure", error);
    return json<EmailError>(
      {
        error: "Something went wrong at our end while checking that domain.",
        hint: "That's our bug, not your DNS.",
      },
      500,
    );
  }
}

function json<T>(data: T, status: number, headers?: Record<string, string>) {
  return NextResponse.json(data, { status, headers });
}
