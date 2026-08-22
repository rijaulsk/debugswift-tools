import { AlertTriangle, Check, Info, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { toolHref } from "@/lib/params";
import { CHECK_GROUPS, type AuditResult, type CheckStatus } from "@/lib/audit/types";

/* The result, as a ledger.
 *
 * Design note, because it will look like an omission otherwise: there is no
 * green and no red here.
 *
 * ⚠️ THE REASON GIVEN HERE USED TO BE WRONG, corrected 22 Aug 2026. It claimed
 * the token tables have no semantic status colours and that a green would be an
 * invented hex. They do — globals.css defines success/warning/danger ramps. The
 * DECISION stands, but on its actual merits:
 *
 *   1. Those tokens are scoped "UI states only" — a field that failed
 *      validation, a toast. This is a 34-row ledger, not a form error.
 *   2. Six failing checks would put six alarm-coloured markers in one view,
 *      which is the same argument that keeps clay off these rows.
 *   3. Colour-alone status fails the people most likely to need an audit tool.
 *      This repo already says so out loud in BrandKit's pair matrix, which
 *      labels every cell with a word precisely so colour is never the only
 *      carrier. Applying that to our own report is consistency, not caution.
 *
 * So status is carried by an uppercase label in the eyebrow role plus an icon,
 * coloured from the existing palette — Indigo 600 for pass, Ink for warn, Clay
 * 700 for fail, Slate for info. Clay 700 rather than Clay 500/600 because this
 * is small text on Cream and the lighter steps fall under 4.5:1.
 *
 * No clay BACKGROUNDS: a page with six failing checks would otherwise put six
 * clay fills in one view and blow the ≤2% ration on its own.
 *
 * Every failing row shows its `found` string, which is a value read off the
 * audited page. Those strings are rendered as TEXT, never as HTML — the content
 * came off somebody else's website and is not trusted. */

const statusLabel: Record<CheckStatus, string> = {
  pass: "Passed",
  warn: "Worth a look",
  fail: "Needs fixing",
  info: "For information",
};

const statusClass: Record<CheckStatus, string> = {
  pass: "text-indigo-600",
  warn: "text-ink",
  fail: "text-clay-700",
  info: "text-slate",
};

/* lucide at 20px / 1.5px stroke, per design system §4. These were typed
 * characters — "✓", "!", "✕", "·" — which meant the status marker rendered in
 * whatever the reader's font decided, and the "·" for info was very nearly
 * invisible. Icons also let the marker be aria-hidden honestly: the status is
 * already stated in words beside it, so the glyph is decoration and screen
 * readers should skip it rather than announce a stray character. */
const statusIcon: Record<CheckStatus, LucideIcon> = {
  pass: Check,
  warn: AlertTriangle,
  fail: X,
  info: Info,
};

/** The row's status marker. A component rather than a lookup at the call site
 *  so the row map stays a concise arrow — the alternative was wrapping 45 lines
 *  of JSX in a block body to hold one `const`, which is a large diff for no
 *  gain. */
function StatusMarker({ status }: { status: CheckStatus }) {
  const Icon = statusIcon[status];
  return (
    <Icon
      size={20}
      strokeWidth={1.5}
      aria-hidden="true"
      /* translate-y nudges the icon onto the text's optical baseline — an icon
       * box has no baseline of its own, so items-baseline hangs it low. */
      className={`shrink-0 translate-y-[3px] ${statusClass[status]}`}
    />
  );
}

export default function AuditReport({ result }: { result: AuditResult }) {
  const checked = new Date(result.fetchedAt);
  /* Checks that ran but didn't apply — no images on the page, so nothing to say
   * about alt text. They are shown, and excluded from the score, and the
   * difference is stated. A denominator that silently shrinks is how a visitor
   * ends up comparing two audits that were never scored the same way. */
  const skipped = result.checks.length - result.score.total;

  return (
    <div>
      {/* Score. The numerals are the oversized display role; the caveat sits
       * directly under them rather than in a footnote, because "12 of 18" is
       * meaningless without knowing whose eighteen. */}
      <div className="border-b-[1.5px] border-ink pb-8">
        <p className="text-eyebrow uppercase text-indigo-600">The result</p>
        <p className="mt-3 text-h1 font-bold tabular-nums text-ink">
          {result.score.passed} of {result.score.total}
          <span className="ml-3 text-h3 font-medium text-slate">checks passed</span>
        </p>
        <p className="mt-4 max-w-2xl text-small text-slate">
          That&apos;s this tool&apos;s opinion of {result.score.total} specific
          things, not a grade out of a hundred. The list below is the score —
          nothing is hidden.
          {skipped > 0 && (
            <>
              {" "}
              {/* Explicit {" "} after {skipped} — without it this rendered
                * "6didn't apply". Same JSX whitespace collapse the footer's
                * copyright line carries a note about; when a number butts
                * straight against a word the reader sees a typo in a report
                * whose whole pitch is that its numbers are careful. */}
              We ran {result.checks.length} checks; {skipped}{" "}
              didn&apos;t apply to this page and{" "}
              {skipped === 1 ? "is" : "are"} marked{" "}
              <span className="text-ink">for information</span> below rather than
              counted.
            </>
          )}
        </p>
        <p className="mt-4 break-words text-small text-slate">
          Checked{" "}
          <span className="text-slate">{result.finalUrl}</span>
          {" · "}
          <time dateTime={result.fetchedAt}>
            {checked.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
          {result.requestedUrl &&
            !result.finalUrl.startsWith(result.requestedUrl) &&
            result.redirects.length > 0 && (
              <>
                {" · redirected from what you typed"}
              </>
            )}
        </p>
      </div>

      {CHECK_GROUPS.map((group) => {
        const rows = result.checks.filter((c) => c.group === group);
        if (!rows.length) return null;

        return (
          <section key={group} className="mt-10">
            <h3 className="text-eyebrow uppercase text-indigo-600">{group}</h3>
            <ul className="mt-4 divide-y-[1.5px] divide-mist border-y-[1.5px] border-mist">
              {rows.map((check) => (
                <li key={check.id} className="py-5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <StatusMarker status={check.status} />
                    <span className="font-medium text-ink">{check.label}</span>
                    <span
                      className={`text-eyebrow uppercase ${statusClass[check.status]}`}
                    >
                      {statusLabel[check.status]}
                    </span>
                  </div>
                  <p className="mt-2 break-words text-slate">{check.found}</p>
                  <p className="mt-1 text-small text-slate">{check.why}</p>
                  {check.fix && (
                    <p className="mt-3 border-l-[1.5px] border-mist pl-4 text-small text-slate">
                      <span className="font-medium text-ink">What to do: </span>
                      {check.fix}
                    </p>
                  )}
                  {/* The handoff. A report that names a problem and then leaves
                    * you to retype the value into another page has done half a
                    * job — so where a tool here actually fixes this, the link
                    * carries the value across. next/link with an UNPREFIXED
                    * path: basePath adds the /tools. Hidden in print, where a
                    * link is just underlined text nobody can click. */}
                  {check.fixWith && (
                    <p className="mt-3 print:hidden">
                      <Link
                        href={toolHref(check.fixWith.slug, check.fixWith.params)}
                        className="text-small font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
                      >
                        {check.fixWith.label} →
                      </Link>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
