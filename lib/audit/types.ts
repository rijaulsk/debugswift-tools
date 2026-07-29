/* Shapes for the website audit. Shared by the server route that produces a
 * result and the client component that renders one. */

export type CheckStatus = "pass" | "warn" | "fail" | "info";

/** The groups a visitor sees as headings, in render order. */
export const CHECK_GROUPS = [
  "Findability",
  "On the page",
  "How it shares",
  "Getting in touch",
  "Delivery",
] as const;

export type CheckGroup = (typeof CHECK_GROUPS)[number];

/** A handoff into the tool that fixes this finding, with the value carried
 *  across. See lib/params.ts — this is what stops the tools being seven
 *  separate pages that each abandon you at the useful moment. */
export type FixWith = {
  /** Tool slug, e.g. "meta-generator". */
  slug: string;
  label: string;
  /** Query params to prefill the target tool with. */
  params: Record<string, string>;
};

export type Check = {
  id: string;
  group: CheckGroup;
  label: string;
  status: CheckStatus;
  /** What was actually found on the page. Quoted verbatim wherever it is a
   *  value the page itself carries — never paraphrased into a verdict. */
  found: string;
  /** One plain sentence on why it matters. No statistics, ever. */
  why: string;
  /** What to change. Present only when the status is not "pass". */
  fix?: string;
  /** Offered only when a tool in this repo genuinely does the job. */
  fixWith?: FixWith;
};

export type AuditResult = {
  /** What the visitor typed, normalised. */
  requestedUrl: string;
  /** Where we ended up after redirects — the page actually measured. */
  finalUrl: string;
  redirects: string[];
  httpStatus: number;
  fetchedAt: string;
  /** Measured, and labelled as a single sample in the copy. Never presented as
   *  "your site speed". */
  ttfbMs: number;
  htmlBytes: number;
  checks: Check[];
  /** "X of Y checks passed". Both numbers are counted from `checks`, so the
   *  score can never disagree with the list underneath it — the list IS the
   *  score. "info" checks are excluded from both. */
  score: { passed: number; total: number };
};

/** What the API returns when it could not produce a result. The tool renders
 *  this as the whole answer — it never falls back to a partial score, because a
 *  score computed from a page we failed to read would be a fabricated result. */
export type AuditError = {
  error: string;
  /** Set when the caller can fix it by editing their input. */
  hint?: string;
};

export function isAuditError(v: AuditResult | AuditError): v is AuditError {
  return "error" in v;
}
