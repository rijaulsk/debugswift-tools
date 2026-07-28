import { CHECK_GROUPS, type AuditResult, type CheckStatus } from "@/lib/audit/types";

/* The result, as a ledger.
 *
 * Design note, because it will look like an omission otherwise: there is no
 * green and no red here. The token tables (design system §1) have no semantic
 * status colours, and inventing a green would be inventing a hex. Status is
 * carried by an uppercase label in the eyebrow role plus a glyph, coloured from
 * the existing palette — Indigo 600 for pass, Ink for warn, Clay 700 for fail,
 * Slate for info. Clay 700 rather than Clay 500/600 because this is small text
 * on Cream and the lighter steps fall under 4.5:1.
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

const statusGlyph: Record<CheckStatus, string> = {
  pass: "✓",
  warn: "!",
  fail: "✕",
  info: "·",
};

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
              We ran {result.checks.length} checks; {skipped} didn&apos;t apply
              to this page and {skipped === 1 ? "is" : "are"} marked{" "}
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
                    <span
                      aria-hidden="true"
                      className={`font-bold ${statusClass[check.status]}`}
                    >
                      {statusGlyph[check.status]}
                    </span>
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
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
