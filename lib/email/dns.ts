import { Resolver } from "node:dns/promises";

/* DNS, with a timeout and honest failure modes.
 *
 * Node's resolver has no per-query timeout worth relying on — the default
 * retry behaviour can hang for many seconds on a dead nameserver, and a tool
 * that appears frozen is worse than one that says it could not find out. Each
 * lookup is therefore raced against a deadline.
 *
 * THE DISTINCTION THIS FILE EXISTS TO PRESERVE, and it matters more here than
 * almost anywhere else in the repo: there are THREE outcomes to a DNS lookup,
 * not two.
 *
 *   found    — records came back
 *   absent   — the server answered, authoritatively, that there are none
 *   unknown  — we could not find out (timeout, SERVFAIL, network)
 *
 * Collapsing `unknown` into `absent` is how a deliverability checker tells
 * somebody their SPF record is missing when it is sitting there and our query
 * timed out. That is a lie with consequences: acting on it means editing a DNS
 * zone that was already correct. Every function here returns which of the three
 * happened, and the UI is required to render `unknown` differently from
 * `absent`.
 */

const TIMEOUT_MS = 6000;

/** Public resolvers, not the host's. A serverless container's resolver is a
 *  black box that may cache aggressively or answer differently by region; two
 *  well-known public resolvers give an answer closer to what the rest of the
 *  internet sees, which is the thing being reported on. */
const NAMESERVERS = ["1.1.1.1", "8.8.8.8"];

export type Lookup<T> =
  | { state: "found"; records: T[] }
  | { state: "absent" }
  | { state: "unknown"; why: string };

function resolver(): Resolver {
  const r = new Resolver({ timeout: TIMEOUT_MS, tries: 2 });
  r.setServers(NAMESERVERS);
  return r;
}

async function withDeadline<T>(work: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("TIMEOUT")), TIMEOUT_MS + 500);
  });
  try {
    return await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer!);
  }
}

/* ENODATA and NOTFOUND are the resolver saying "no such record" — that is an
 * answer. Everything else (SERVFAIL, REFUSED, timeouts) is us failing to get
 * one, and must not be reported as absence. */
const ABSENT_CODES = new Set(["ENODATA", "ENOTFOUND", "NXDOMAIN"]);

function classify(error: unknown): Lookup<never> {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  if (ABSENT_CODES.has(code)) return { state: "absent" };
  if (error instanceof Error && error.message === "TIMEOUT") {
    return { state: "unknown", why: "the lookup timed out" };
  }
  return { state: "unknown", why: code ? `the resolver said ${code}` : "the lookup failed" };
}

/** TXT records, each joined from its character strings. A long record is split
 *  into 255-byte chunks on the wire and must be concatenated before parsing —
 *  SPF records routinely exceed that, and reading only the first chunk is a
 *  classic way to mis-parse one. */
export async function txt(name: string): Promise<Lookup<string>> {
  try {
    const chunks = await withDeadline(resolver().resolveTxt(name));
    const records = chunks.map((parts) => parts.join(""));
    return records.length > 0 ? { state: "found", records } : { state: "absent" };
  } catch (error) {
    return classify(error);
  }
}

export async function mx(name: string): Promise<Lookup<{ exchange: string; priority: number }>> {
  try {
    const records = await withDeadline(resolver().resolveMx(name));
    return records.length > 0 ? { state: "found", records } : { state: "absent" };
  } catch (error) {
    return classify(error);
  }
}

/* NOTE — there is deliberately no `resolves()` helper here.
 *
 * An early version had one, for counting SPF's lookup budget. It was the wrong
 * model: RFC 7208 caps the number of MECHANISMS that require a DNS query, not
 * the number of queries that succeed. A dead include: still spends one of the
 * ten. So the count in lib/email/checks.ts is made syntactically from the
 * record, and only include: and redirect= are actually resolved — because those
 * two expand into another record whose own mechanisms must also be counted. */
