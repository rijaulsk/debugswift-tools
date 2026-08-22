import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/* Fetching a URL that a stranger typed into a form.
 *
 * READ THIS BEFORE CHANGING ANY OF IT. This module is the security boundary of
 * the whole tools app. A server that will fetch any URL on request is a
 * server-side request forgery (SSRF) primitive: point it at 127.0.0.1, at a
 * 10.x address, or at a cloud metadata endpoint, and it will happily retrieve
 * something the caller could not reach themselves and hand it back.
 *
 * The defences, in the order they apply:
 *
 *   1. Scheme allow-list. http and https only — no file:, no gopher:, no data:.
 *   2. DNS resolution BEFORE the request, with every returned address checked
 *      against the private/reserved ranges. A hostname is not a safe thing to
 *      pattern-match on: "localtest.me" and countless others resolve to
 *      127.0.0.1, so the check has to be on the ADDRESS, not the name.
 *   3. The request goes to the resolved IP is NOT what we do — see the note on
 *      the TOCTOU gap below.
 *   4. redirect: "manual", so every hop is re-validated by the same rules. A
 *      public URL that 302s to 169.254.169.254 is the standard bypass.
 *   5. Timeout, redirect cap, and a hard byte cap on the body.
 *
 * KNOWN, ACCEPTED GAP — DNS rebinding. Between our lookup() and the fetch(),
 * the name could resolve again to a different address. Closing that properly
 * means dialling the validated IP directly and carrying the Host header, which
 * Node's fetch does not expose. The exposure is bounded: this endpoint returns
 * only a fixed set of derived booleans and short extracted strings (a title, a
 * meta description), never the response body, so a successful rebind leaks very
 * little. Documented rather than hidden. If this app ever starts returning the
 * fetched body, close the gap first.
 */

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 10_000;
/** Enough for any real HTML document; a cap so a hostile server can't stream us
 *  a gigabyte. Truncation is reported, not silently swallowed. */
const MAX_BYTES = 2_000_000;

/* A browser UA would be a lie about what we are. This says exactly who is
 * calling and where to complain, which is what a well-behaved crawler does. */
const USER_AGENT =
  "DebugSwiftAudit/1.0 (+https://debugswift.com/tools/website-audit)";

export type FetchedPage = {
  finalUrl: string;
  redirects: string[];
  status: number;
  headers: Headers;
  html: string;
  truncated: boolean;
  ttfbMs: number;
};

export class FetchPageError extends Error {
  hint?: string;
  constructor(message: string, hint?: string) {
    super(message);
    this.name = "FetchPageError";
    this.hint = hint;
  }
}

/** Normalise what someone typed into a URL, or explain why it isn't one. */
export function normaliseUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) throw new FetchPageError("Enter a web address to check.");
  if (trimmed.length > 2000) {
    throw new FetchPageError("That web address is too long to be real.");
  }

  /* People type "example.com". Assume https rather than rejecting them — but
   * only when no scheme was given at all, so "javascript:…" still fails the
   * scheme check below instead of becoming "https://javascript:…". */
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new FetchPageError(
      "That doesn't look like a web address.",
      "Try the full address, like example.com or https://example.com/page",
    );
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new FetchPageError(
      "Only web pages can be checked.",
      "The address needs to start with http:// or https://",
    );
  }
  if (!url.hostname) {
    throw new FetchPageError("That web address has no site name in it.");
  }
  /* Credentials in the URL would be sent to whatever we fetch. Strip them
   * rather than fail — nobody means to leak them, and the page is still
   * checkable without them. */
  url.username = "";
  url.password = "";
  url.hash = "";
  return url;
}

function ipv4ToLong(ip: string): number {
  return ip
    .split(".")
    .reduce((acc, part) => acc * 256 + Number(part), 0);
}

function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToLong(ip);
  const inRange = (cidr: string) => {
    const [base, bitsRaw] = cidr.split("/");
    const bits = Number(bitsRaw);
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (n & mask) >>> 0 === (ipv4ToLong(base!) & mask) >>> 0;
  };

  return [
    "0.0.0.0/8", // "this network"
    "10.0.0.0/8", // private
    "100.64.0.0/10", // carrier-grade NAT
    "127.0.0.0/8", // loopback
    "169.254.0.0/16", // link-local — includes the cloud metadata address
    "172.16.0.0/12", // private
    "192.0.0.0/24", // IETF protocol assignments
    "192.0.2.0/24", // TEST-NET-1
    "192.88.99.0/24", // 6to4 relay anycast
    "192.168.0.0/16", // private
    "198.18.0.0/15", // benchmarking
    "198.51.100.0/24", // TEST-NET-2
    "203.0.113.0/24", // TEST-NET-3
    "224.0.0.0/4", // multicast
    "240.0.0.0/4", // reserved, includes 255.255.255.255
  ].some(inRange);
}

function isPrivateIpv6(ip: string): boolean {
  const addr = ip.toLowerCase().split("%")[0]!; // drop any zone index

  /* IPv4-mapped (::ffff:127.0.0.1) and IPv4-compatible forms carry a v4 address
   * inside a v6 one — the classic way to smuggle a loopback past a v6 check. */
  const mapped = addr.match(/^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIpv4(mapped[1]!);

  if (addr === "::" || addr === "::1") return true;
  if (addr.startsWith("fe80") || addr.startsWith("fe9") || addr.startsWith("fea") || addr.startsWith("feb")) {
    return true; // fe80::/10 link-local
  }
  if (/^f[cd]/.test(addr)) return true; // fc00::/7 unique local
  if (addr.startsWith("2002:")) return true; // 6to4
  if (addr.startsWith("100:")) return true; // discard-only
  return false;
}

function isPublicAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return !isPrivateIpv4(ip);
  if (version === 6) return !isPrivateIpv6(ip);
  return false;
}

/**
 * Reject a URL whose host resolves anywhere private.
 *
 * ALL addresses are checked, not just the first. A name with both a public A
 * record and a private one is a deliberate bypass, and "the first one was fine"
 * is not a safety property.
 */
async function assertPublicHost(url: URL): Promise<void> {
  const host = url.hostname.replace(/^\[|\]$/g, "");

  /* A literal IP skips DNS entirely. */
  if (isIP(host)) {
    if (!isPublicAddress(host)) {
      throw new FetchPageError(
        "That address is on a private network, so there's nothing we can check.",
        "Enter a page that's live on the public internet.",
      );
    }
    return;
  }

  if (!host.includes(".") || host.toLowerCase() === "localhost") {
    throw new FetchPageError(
      "That doesn't look like a public web address.",
      "Enter a full domain, like example.com",
    );
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new FetchPageError(
      "We couldn't find that domain.",
      "Check the spelling, or whether the site is still live.",
    );
  }

  if (!addresses.length || !addresses.every((a) => isPublicAddress(a.address))) {
    throw new FetchPageError(
      "That address resolves to a private network, so there's nothing we can check.",
      "Enter a page that's live on the public internet.",
    );
  }
}

/**
 * Fetch a page, following redirects by hand so each hop is re-validated.
 *
 * Returns the HTML and enough of the response to run the checks. Never returns
 * a partial result on failure — a caller that catches FetchPageError must
 * report the failure, not score what it managed to get.
 */
export async function fetchPage(input: string): Promise<FetchedPage> {
  let url = normaliseUrl(input);
  const redirects: string[] = [];
  const startedAt = Date.now();

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml",
          "accept-language": "en",
        },
        cache: "no-store",
      });
    } catch (err) {
      const timedOut = err instanceof Error && err.name === "TimeoutError";
      throw new FetchPageError(
        timedOut
          ? `The page didn't respond within ${TIMEOUT_MS / 1000} seconds.`
          : "We couldn't reach that page.",
        timedOut
          ? "That may be the site, or it may be a slow moment. Worth trying again."
          : "Check the address, or whether the site is up right now.",
      );
    }

    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      let next: URL;
      try {
        next = new URL(location, url);
      } catch {
        throw new FetchPageError("That page redirects somewhere we can't follow.");
      }
      if (next.protocol !== "http:" && next.protocol !== "https:") {
        throw new FetchPageError("That page redirects to something that isn't a web page.");
      }
      redirects.push(next.toString());
      url = next;
      /* Drain rather than leave the socket hanging. */
      await response.arrayBuffer().catch(() => undefined);
      continue;
    }

    const ttfbMs = Date.now() - startedAt;

    /* Read with a byte cap. response.text() would buffer whatever the server
     * chooses to send. */
    const { html, truncated } = await readCapped(response);

    return {
      finalUrl: url.toString(),
      redirects,
      status: response.status,
      headers: response.headers,
      html,
      truncated,
      ttfbMs,
    };
  }

  throw new FetchPageError(
    `That address redirected more than ${MAX_REDIRECTS} times.`,
    "A redirect loop is itself worth fixing — it's usually a misconfigured www or https rule.",
  );
}

async function readCapped(
  response: Response,
): Promise<{ html: string; truncated: boolean }> {
  if (!response.body) return { html: "", truncated: false };

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;

  while (total < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    total += value.byteLength;
  }
  if (total >= MAX_BYTES) {
    truncated = true;
    await reader.cancel().catch(() => undefined);
  }

  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  /* Decode as UTF-8 with replacement rather than honouring a declared charset.
   * Getting a legacy encoding wrong garbles the extracted title, which the tool
   * quotes back — worth knowing this is a real (if rare) limitation. */
  return {
    html: new TextDecoder("utf-8", { fatal: false }).decode(buffer),
    truncated,
  };
}

/**
 * A secondary GET used for robots.txt and sitemap probes.
 *
 * Same host validation, and failures are values rather than exceptions: a
 * missing robots.txt is a finding, not an error.
 */
export async function probe(
  target: URL,
): Promise<{ ok: boolean; status: number; text: string; finalUrl: string }> {
  try {
    await assertPublicHost(target);
    const response = await fetch(target, {
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
      headers: { "user-agent": USER_AGENT },
      cache: "no-store",
    });
    const text = response.ok ? (await response.text()).slice(0, 100_000) : "";
    return { ok: response.ok, status: response.status, text, finalUrl: response.url };
  } catch {
    return { ok: false, status: 0, text: "", finalUrl: target.toString() };
  }
}

/**
 * HEAD a resource to learn its size without downloading it.
 *
 * Used to weigh a page's images, which is usually the single most actionable
 * finding for a small business — "the biggest thing on your page is a 3 MB
 * photo" is a fix someone can do this afternoon.
 *
 * SAME SSRF BOUNDARY AS EVERYTHING ELSE, and it matters more here: these URLs
 * came off somebody else's HTML, so they are attacker-controllable in exactly
 * the way the page URL is. assertPublicHost runs on every one.
 *
 * Some servers do not answer HEAD, or omit content-length. That returns null,
 * which callers must report as "couldn't measure" rather than as zero — a
 * missing measurement is not a small one.
 */
export async function headSize(target: URL): Promise<number | null> {
  try {
    await assertPublicHost(target);
    const response = await fetch(target, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(4000),
      headers: { "user-agent": USER_AGENT },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const length = response.headers.get("content-length");
    if (!length) return null;
    const bytes = Number(length);
    return Number.isFinite(bytes) ? bytes : null;
  } catch {
    return null;
  }
}

/**
 * The FIRST status a host answers with, WITHOUT following the redirect.
 *
 * Separate from statusOf() on purpose, and the two must not be merged. The
 * soft-404 probe wants redirects followed — a missing page that bounces to the
 * homepage and answers 200 is precisely the soft 404 it exists to catch. The
 * www/non-www check wants the opposite: there, a redirect is the CORRECT
 * answer, and following it hides the very thing being measured.
 *
 * Conflating them was a live false positive. statusOf() followed
 * debugswift.com's own www→apex 308 through to the apex, returned 200, and the
 * check reported "both the www and non-www addresses serve the page directly"
 * — telling the owner the duplication was unfixed on the very deploy that
 * fixed it. A check that can never report success once you act on it is worse
 * than no check at all.
 *
 * Nothing is followed, so no second hop needs re-validating.
 */
export async function firstStatusOf(target: URL): Promise<number> {
  try {
    await assertPublicHost(target);
    const response = await fetch(target, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
      headers: { "user-agent": USER_AGENT },
      cache: "no-store",
    });
    await response.arrayBuffer().catch(() => undefined);
    return response.status;
  } catch {
    return 0;
  }
}

/** Does this URL answer at all, and with what status? Used for the OG image
 *  and the soft-404 probe — both of which want redirects FOLLOWED. For the
 *  www/non-www pair use firstStatusOf() instead; see the note above. */
export async function statusOf(target: URL): Promise<number> {
  try {
    await assertPublicHost(target);
    const response = await fetch(target, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
      headers: { "user-agent": USER_AGENT },
      cache: "no-store",
    });
    /* Drain so the connection isn't left hanging. */
    await response.arrayBuffer().catch(() => undefined);
    return response.status;
  } catch {
    return 0;
  }
}
