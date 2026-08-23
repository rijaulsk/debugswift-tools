/* The deeper checks — the three things worth knowing that we cannot measure
 * ourselves, fetched from Google, Mozilla and the domain registry.
 *
 * WHY THIS IS A SEPARATE REQUEST AND NOT PART OF auditPage().
 *
 *   1. Speed. The audit answers in well under a second. A PageSpeed Insights
 *      run takes ten to thirty, because Google is really loading the page in a
 *      real browser. Folding that in would make every audit feel broken, and
 *      would push a serverless invocation towards its ceiling for a result most
 *      visitors did not ask for.
 *   2. Consent, in the only form that means anything here. Our own 34 checks
 *      involve one fetch from our server. THESE hand the address to three other
 *      companies. That should be a thing a person chooses, on a button, having
 *      read what it does — not a thing that happens because they typed a URL.
 *
 * WHAT THESE RESULTS MUST NEVER DO: enter the score. "31 of 33 checks passed"
 * is this tool's opinion of its own checks. Folding Google's Lighthouse number
 * into it would mean the denominator silently changed and two audits stopped
 * being comparable. They render as their own attributed section.
 *
 * ATTRIBUTION IS THE HONESTY MECHANISM HERE. The repo's rule is "never invent a
 * benchmark". A Lighthouse score IS a benchmark — but it is Google's, said out
 * loud as Google's, which is a different thing from us inventing one. Every
 * figure below is captioned with whose opinion it is.
 *
 * NO SSRF SURFACE. Unlike lib/audit/fetchPage.ts, nothing here fetches a URL
 * the caller chose. The three endpoints are fixed and ours; the caller's
 * hostname travels as an encoded query parameter. It is still validated before
 * use, because a hostname is not a free-text field and shipping one unchecked
 * into someone else's API is how you find out it was.
 */

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const OBSERVATORY_ENDPOINT = "https://observatory-api.mdn.mozilla.net/api/v2/scan";
const RDAP_ENDPOINT = "https://rdap.org/domain";

/* Generous, because the whole point of this route is that it is slow. Google
 * genuinely takes tens of seconds; cutting it short would report a failure that
 * is ours, not theirs. */
const PSI_TIMEOUT_MS = 60_000;
const FAST_TIMEOUT_MS = 15_000;

export type DeepFailure = { ok: false; reason: string };

export type PagespeedResult = {
  ok: true;
  /** Lighthouse performance category, 0–100. Google's number, LAB data. */
  /** All four Lighthouse categories, 0–100, in Google's own order.
   *
   *  Performance alone was the first version and it was a thin reading of a
   *  report Google had already produced in full: Lighthouse runs every audit
   *  regardless, so asking for one category threw three away for no saving.
   *  Accessibility in particular is the one a small business is most likely to
   *  be failing and least likely to have heard of. */
  scores: { id: string; label: string; score: number }[];
  strategy: "mobile";
  /** Lab metrics, as Google formats them for display. */
  metrics: { label: string; value: string }[];
  /** The specific things costing the most load time, biggest first — Google's
   *  own "opportunity" audits with an estimated saving attached. This is the
   *  part that turns a score into something actionable. */
  opportunities: { label: string; saving: string }[];
  /** Real-user data from the Chrome UX Report, when Google has enough traffic
   *  for this origin to report it. Absent is normal and is NOT a failure — it
   *  means the site is too quiet to have field data, which is itself worth
   *  saying rather than hiding. */
  field: { label: string; value: string; verdict: string }[] | null;
};

export type SecurityResult = {
  ok: true;
  /** Mozilla's letter grade, A+ through F. */
  grade: string;
  score: number;
  passed: number;
  total: number;
  detailsUrl: string;
};

export type DomainResult = {
  ok: true;
  registered: string;
  ageYears: number;
};

export type DeepChecks = {
  pagespeed: PagespeedResult | DeepFailure;
  security: SecurityResult | DeepFailure;
  domain: DomainResult | DeepFailure;
};

/** A hostname we are willing to put in someone else's query string. Deliberately
 *  strict: letters, digits, hyphens and dots, with a dot in it and no scheme,
 *  port, path, credentials or whitespace. */
export function safeHostname(input: string): string | null {
  const host = input.trim().toLowerCase();
  if (host.length === 0 || host.length > 253) return null;
  if (!/^[a-z0-9.-]+$/.test(host)) return null;
  if (!host.includes(".") || host.startsWith(".") || host.endsWith(".")) return null;
  if (host.includes("..")) return null;
  return host;
}

/** Carries the upstream status so callers can tell "they said no" apart from
 *  "we never got there". Quota exhaustion in particular is a real, actionable
 *  answer and must not be reported as a network failure. */
class UpstreamError extends Error {
  constructor(readonly status: number) {
    super(`upstream answered ${status}`);
    this.name = "UpstreamError";
  }
}

async function getJson(
  url: string,
  timeoutMs: number,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new UpstreamError(response.status);
  }
  return response.json();
}

/* ---------------------------------------------------------------- pagespeed */

type PsiAudit = {
  displayValue?: unknown;
  title?: unknown;
  score?: unknown;
  details?: { type?: unknown; overallSavingsMs?: unknown };
};

/** The four Lighthouse categories, in Google's own order. Requesting all four
 *  costs nothing extra — Lighthouse runs every audit either way, so asking for
 *  one was throwing three away. */
const PSI_CATEGORIES = [
  ["performance", "Performance"],
  ["accessibility", "Accessibility"],
  ["best-practices", "Best practices"],
  ["seo", "SEO"],
] as const;

/** The five lab metrics worth showing, in the order Lighthouse reports them. */
const PSI_METRIC_KEYS = [
  "first-contentful-paint",
  "largest-contentful-paint",
  "total-blocking-time",
  "cumulative-layout-shift",
  "speed-index",
] as const;

const FIELD_LABELS: Record<string, string> = {
  LARGEST_CONTENTFUL_PAINT_MS: "Largest contentful paint",
  INTERACTION_TO_NEXT_PAINT: "Interaction to next paint",
  CUMULATIVE_LAYOUT_SHIFT_SCORE: "Cumulative layout shift",
};

const FIELD_VERDICTS: Record<string, string> = {
  FAST: "good",
  AVERAGE: "needs improvement",
  SLOW: "poor",
};

export async function fetchPagespeed(
  host: string,
  apiKey: string | undefined,
): Promise<PagespeedResult | DeepFailure> {
  /* Stated plainly rather than silently skipped: without a key Google answers
   * 429 on the first request from a shared address, which would surface as a
   * mysterious upstream error. */
  if (!apiKey) {
    return {
      ok: false,
      reason:
        "PageSpeed isn't configured on this deployment, so we didn't ask Google.",
    };
  }

  try {
    const categoryParams = PSI_CATEGORIES.map(([id]) => `&category=${id}`).join("");
    const url =
      `${PSI_ENDPOINT}?url=${encodeURIComponent(`https://${host}`)}` +
      `&strategy=mobile${categoryParams}&key=${encodeURIComponent(apiKey)}`;
    const data = (await getJson(url, PSI_TIMEOUT_MS)) as {
      lighthouseResult?: {
        categories?: Record<string, { score?: unknown }>;
        audits?: Record<string, PsiAudit>;
      };
      loadingExperience?: {
        metrics?: Record<string, { category?: unknown }>;
      };
    };

    const categories = data.lighthouseResult?.categories ?? {};
    /* Only categories that came back with a real number. A category Google
     * declined to score is dropped rather than shown as zero — rendering 0/100
     * because a field was absent would invent the worst possible result for
     * someone's site. */
    const scores = PSI_CATEGORIES.flatMap(([id, label]) => {
      const raw = categories[id]?.score;
      return typeof raw === "number" && Number.isFinite(raw)
        ? [{ id, label, score: Math.round(raw * 100) }]
        : [];
    });

    if (scores.length === 0) {
      return { ok: false, reason: "Google answered, but without a score we could read." };
    }

    const audits = data.lighthouseResult?.audits ?? {};
    const metrics = PSI_METRIC_KEYS.flatMap((key) => {
      const entry = audits[key];
      const label = typeof entry?.title === "string" ? entry.title : null;
      const value = typeof entry?.displayValue === "string" ? entry.displayValue : null;
      /* Only metrics that arrived complete are shown. A row with a label and a
       * blank value looks like the page is broken. */
      return label && value ? [{ label, value }] : [];
    });

    /* The specific things costing load time, biggest first.
     *
     * Lighthouse marks these audits `details.type === "opportunity"` and
     * attaches an estimated saving in milliseconds. A score tells someone their
     * page is slow; this tells them which image, script or stylesheet is doing
     * it — which is the difference between a number and an instruction.
     *
     * Filtered to audits that actually failed AND have a saving worth acting
     * on. Google emits opportunities with a 0ms saving; listing those pads the
     * report with work that would change nothing. */
    const opportunities = Object.values(audits)
      .flatMap((entry) => {
        if (entry?.details?.type !== "opportunity") return [];
        const savingMs = entry.details.overallSavingsMs;
        const label = typeof entry.title === "string" ? entry.title : null;
        const value = typeof entry.displayValue === "string" ? entry.displayValue : null;
        const scored = typeof entry.score === "number" ? entry.score : 1;
        if (!label || typeof savingMs !== "number" || savingMs < 100 || scored >= 0.9) {
          return [];
        }
        return [{ label, saving: value ?? `${(savingMs / 1000).toFixed(1)} s`, savingMs }];
      })
      .sort((a, b) => b.savingMs - a.savingMs)
      .slice(0, 5)
      .map(({ label, saving }) => ({ label, saving }));

    const fieldMetrics = data.loadingExperience?.metrics ?? {};
    const field = Object.entries(fieldMetrics).flatMap(([key, entry]) => {
      const label = FIELD_LABELS[key];
      const category = typeof entry?.category === "string" ? entry.category : null;
      const verdict = category ? FIELD_VERDICTS[category] : null;
      return label && verdict ? [{ label, value: category!, verdict }] : [];
    });

    return {
      ok: true,
      scores,
      strategy: "mobile",
      metrics,
      opportunities,
      field: field.length > 0 ? field : null,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return { ok: false, reason: "Google took longer than a minute and we stopped waiting." };
    }
    /* 429 is the predictable one and deserves saying plainly: the PageSpeed
     * quota belongs to this deployment's key, so it is shared across everyone
     * using the tool. Reporting that as "couldn't be reached" would send
     * someone looking for a fault on their own site. */
    if (error instanceof UpstreamError) {
      return {
        ok: false,
        reason:
          error.status === 429
            ? "We've used up this tool's PageSpeed allowance for the moment. Worth trying again later — nothing is wrong with your site."
            : `Google answered ${error.status} rather than a result.`,
      };
    }
    return { ok: false, reason: "Google couldn't be reached for this one." };
  }
}

/* -------------------------------------------------------------- observatory */

export async function fetchSecurityGrade(
  host: string,
): Promise<SecurityResult | DeepFailure> {
  try {
    const data = (await getJson(
      `${OBSERVATORY_ENDPOINT}?host=${encodeURIComponent(host)}`,
      FAST_TIMEOUT_MS,
      { method: "POST" },
    )) as {
      grade?: unknown;
      score?: unknown;
      tests_passed?: unknown;
      tests_quantity?: unknown;
      details_url?: unknown;
      error?: unknown;
    };

    if (typeof data.error === "string" && data.error) {
      return { ok: false, reason: `Mozilla couldn't scan that host: ${data.error}` };
    }
    /* A null grade is what Observatory returns for a host it could not reach.
     * That is a real answer about their site, but it is not a grade, and
     * printing "null" or defaulting to F would be inventing one. */
    if (typeof data.grade !== "string" || typeof data.score !== "number") {
      return { ok: false, reason: "Mozilla answered, but without a grade we could read." };
    }

    return {
      ok: true,
      grade: data.grade,
      score: data.score,
      passed: typeof data.tests_passed === "number" ? data.tests_passed : 0,
      total: typeof data.tests_quantity === "number" ? data.tests_quantity : 0,
      detailsUrl:
        typeof data.details_url === "string"
          ? data.details_url
          : `https://developer.mozilla.org/en-US/observatory/analyze?host=${encodeURIComponent(host)}`,
    };
  } catch (error) {
    /* Same distinction as PageSpeed above: a status is Mozilla answering, and
     * saying "couldn't be reached" would be wrong about whose end the problem
     * is. Either way the message stays about OUR request — nothing here is
     * allowed to imply a verdict on their site we did not receive. */
    if (error instanceof UpstreamError) {
      return {
        ok: false,
        reason: `Mozilla answered ${error.status} rather than a grade — often that just means the host wasn't reachable from their scanner.`,
      };
    }
    return { ok: false, reason: "Mozilla's scanner couldn't be reached for this one." };
  }
}

/* --------------------------------------------------------------------- rdap */

export async function fetchDomainAge(
  host: string,
): Promise<DomainResult | DeepFailure> {
  /* RDAP answers for a registrable domain, not for a subdomain — asking it
   * about www.example.co.uk gets a 404. Two labels is right far more often
   * than not; the well-known exceptions (co.uk, com.au) need three, and rather
   * than ship a public-suffix list for one line of output we try the obvious
   * candidates and take the first that answers. */
  const labels = host.split(".");
  const candidates =
    labels.length <= 2
      ? [host]
      : [labels.slice(-2).join("."), labels.slice(-3).join(".")];

  /* Whether ANY candidate got as far as a readable response.
   *
   * This distinction is the whole point and it was wrong in the first version:
   * every failure reported "no registration date was published", which states a
   * fact about someone's domain that we never established. rdap.org redirects
   * to the real registry and that hop is measurably flaky from a datacentre —
   * observed answering on one request and timing out on the next for the same
   * domain. Telling someone their domain has no published registration date
   * because our request wobbled is exactly the class of invented claim the rest
   * of this file exists to prevent. */
  let reached = false;

  for (const candidate of candidates) {
    let data: { events?: { eventAction?: unknown; eventDate?: unknown }[] };
    try {
      data = (await getJson(
        `${RDAP_ENDPOINT}/${encodeURIComponent(candidate)}`,
        FAST_TIMEOUT_MS,
      )) as typeof data;
    } catch {
      /* Could not reach it, or it answered non-2xx. A 404 usually just means we
       * guessed the registrable domain wrong, so try the next candidate — but
       * do NOT record this as having reached a registry. */
      continue;
    }

    reached = true;

    const registration = data.events?.find((e) => e.eventAction === "registration");
    const date =
      typeof registration?.eventDate === "string" ? registration.eventDate : null;
    if (!date) continue;

    const registered = new Date(date);
    if (Number.isNaN(registered.getTime())) continue;

    const years = (Date.now() - registered.getTime()) / (365.25 * 24 * 3600 * 1000);
    return {
      ok: true,
      registered: registered.toISOString().slice(0, 10),
      ageYears: Math.round(years * 10) / 10,
    };
  }

  return {
    ok: false,
    reason: reached
      ? "The registry answered but published no registration date for that domain."
      : "The domain registry didn't answer just now — that's about our request, not your domain.",
  };
}

/* ------------------------------------------------------------- orchestrator */

/**
 * All three, in parallel, each reporting its own success or failure.
 *
 * Deliberately NOT Promise.all-with-rejection: one slow registry must not
 * discard a Lighthouse run that took forty seconds to earn. Each fetcher
 * already resolves to a failure object rather than throwing, so a partial
 * result here means "these two answered and that one didn't", which is exactly
 * what the page says.
 */
export async function runDeepChecks(
  host: string,
  apiKey: string | undefined,
): Promise<DeepChecks> {
  const [pagespeed, security, domain] = await Promise.all([
    fetchPagespeed(host, apiKey),
    fetchSecurityGrade(host),
    fetchDomainAge(host),
  ]);
  return { pagespeed, security, domain };
}
