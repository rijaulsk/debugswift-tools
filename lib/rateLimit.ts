/* A fixed-window rate limiter, in memory.
 *
 * BE HONEST ABOUT WHAT THIS IS. Serverless functions scale horizontally and
 * the map lives inside one instance, so a determined attacker spread across
 * enough concurrent invocations gets a higher effective limit than the number
 * below suggests. It is a speed bump, not a wall.
 *
 * It is still worth having, and in this repo it guards something specific: the
 * audit endpoint makes an outbound HTTP request to a URL the caller chose. Left
 * open, that is a free request amplifier pointed at whatever host someone names,
 * and the bill and the reputation are ours. The limiter caps how fast one client
 * can aim it.
 *
 * It is NOT the important defence against that. The important one is structural
 * and lives in lib/audit/fetchPage.ts: the target must resolve to a public
 * address over http(s), redirects are capped and re-validated, the response is
 * size- and time-limited, and nothing about it is echoed back as HTML. Read that
 * file before changing anything here.
 *
 * If this ever gets genuinely attacked, the upgrade is a shared store (Vercel
 * KV, Upstash) behind this same function signature — no caller changes.
 */

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

/* Unbounded growth would be a slow memory leak on a long-lived instance, so
 * expired windows are swept whenever the map gets large. */
const MAX_TRACKED = 5000;

function sweep(now: number) {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  if (windows.size > MAX_TRACKED) sweep(now);

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

/**
 * Best-effort client identity.
 *
 * x-forwarded-for is client-controlled in general; behind Vercel's proxy the
 * FIRST entry is the real client and everything after it is hop history, which
 * is why only that entry is used. Requests with no usable header share one
 * bucket — coarse, but it fails toward limiting rather than toward allowing.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
