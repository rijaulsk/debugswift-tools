import { AlertTriangle, Check, Info, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import DeepChecks from "@/components/DeepChecks";
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

/**
 * Where the score actually went, per group.
 *
 * "31 of 33" tells you there is a problem and not where it is. The list below
 * answers that, but it is 34 rows long and you have to read all of it. Five
 * bars sit between the two.
 *
 * FORM. Magnitude across five nominal categories, one series. So: a thin
 * horizontal bar per group, direct-labelled. Explicitly not a donut (this is
 * not part-to-whole), not one bar per status (that is four series where the
 * story is one number), and not a value-ramp — the five groups have no natural
 * order, so darker-where-worse would double-encode bar length as hue and burn
 * the only free channel on information the bar already carries. One series,
 * one colour, every bar.
 *
 * COLOUR. Indigo 600 on a Mist track. Not a new decision — Indigo 600 is
 * already this report's "passed", so the bars inherit the meaning rather than
 * inventing a second vocabulary. It also measures 4.01:1 against the track,
 * clearing the 3:1 that non-text graphics need; Indigo 500, which the meta
 * generator's meter uses on the same track, comes to 2.98 and would not.
 *
 * NO TOOLTIP, deliberately. A hover layer is the default for bar marks, but it
 * exists to reveal values the marks cannot state. Every row here is already
 * labelled with its own count, so a tooltip would repeat what is on screen —
 * and a tooltip must never be the only way to read a value anyway.
 *
 * The denominator matches the headline score: checks that did not apply are
 * excluded here exactly as they are there, or the group totals would sum to
 * more than the score they are breaking down.
 *
 * THE VALUE COLUMN IS A FIXED WIDTH, NOT AUTO. With auto, "10 of 11" is wider
 * than "9 of 9" and steals that width from the 1fr track beside it — so the
 * bars get drawn on tracks of different lengths, and comparing them across rows
 * silently compares them against different baselines. A magnitude chart whose
 * baseline moves per row is worse than no chart. Nothing in the markup hints at
 * it; it was caught by looking at the render.
 */
function GroupBreakdown({ result }: { result: AuditResult }) {
  const rows = CHECK_GROUPS.map((group) => {
    const counted = result.checks.filter(
      (c) => c.group === group && c.status !== "info",
    );
    return {
      group,
      passed: counted.filter((c) => c.status === "pass").length,
      total: counted.length,
    };
  }).filter((r) => r.total > 0);

  if (rows.length === 0) return null;

  return (
    <div className="mt-8">
      <p className="text-eyebrow uppercase text-indigo-600">Where it went</p>
      <ul className="mt-4 space-y-3">
        {rows.map(({ group, passed, total }) => (
          <li key={group} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[11rem_1fr_4.5rem]">
            <span className="text-small text-ink sm:order-1">{group}</span>
            {/* The value sits OUTSIDE the bar, never inside it: an in-bar label
              * on a group that passed one of nine has nowhere to go. */}
            <span className="justify-self-end text-small tabular-nums text-slate sm:order-3">
              {passed} of {total}
            </span>
            <span
              aria-hidden="true"
              className="col-span-2 h-2 overflow-hidden rounded-full bg-mist sm:order-2 sm:col-span-1"
            >
              <span
                className="block h-full rounded-full bg-indigo-600"
                style={{ width: `${Math.round((passed / total) * 100)}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The headline, as four facts instead of a paragraph.
 *
 * The report opened with one big number and then 34 rows of prose, and reading
 * it meant reading all of it — "31 of 33" says there is a problem and the next
 * thing on screen is the first of thirty-four paragraphs. These four tiles are
 * the shape DuctForge uses for a takeoff's bottom line, and they answer the
 * questions a visitor actually has in the first three seconds: how much passed,
 * how much is worth a look, how much genuinely needs fixing, and how quickly the
 * page answered.
 *
 * NOT A CHART, deliberately. Four single values with no shared axis are a stat
 * row; drawing them as bars would imply a comparison between "checks" and
 * "milliseconds" that does not exist.
 *
 * Colour follows the report's existing status vocabulary — Indigo 600 passed,
 * Ink worth a look, Clay 700 needs fixing — so this introduces no new meaning,
 * and every tile is labelled in words with an icon beside it. That is the same
 * rule the rows follow and the reason there is still no green and no red here;
 * the long note at the top of this file has the argument.
 *
 * Zero counts still render. A tile that disappears when it hits zero makes the
 * layout move between two audits of the same site, and "0 needs fixing" is the
 * single most reassuring thing this report can say — hiding it throws that away.
 */
function SummaryTiles({ result }: { result: AuditResult }) {
  const count = (s: CheckStatus) =>
    result.checks.filter((c) => c.status === s).length;

  const tiles: { status: CheckStatus; value: string; sub: string }[] = [
    {
      status: "pass",
      value: String(count("pass")),
      sub: `of ${result.score.total} counted`,
    },
    { status: "warn", value: String(count("warn")), sub: "not urgent" },
    { status: "fail", value: String(count("fail")), sub: "worth doing first" },
  ];

  return (
    /* print:grid-cols-4 — A4 minus margins is ~741px, below the `lg` breakpoint,
     * so on paper these wrapped to a 2x2 block and ate half a page. The screen
     * breakpoint can't help: print width has nothing to do with viewport width. */
    <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4 print:grid-cols-4 print:gap-x-4">
      {tiles.map(({ status, value, sub }) => {
        const Icon = statusIcon[status];
        return (
          <div key={status} className="print-keep">
            <p
              className={`flex items-center gap-1.5 text-eyebrow uppercase ${statusClass[status]}`}
            >
              <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
              {statusLabel[status]}
            </p>
            <p className="mt-2 text-h2 font-bold tabular-nums text-ink">{value}</p>
            <p className="mt-1 text-small text-slate">{sub}</p>
          </div>
        );
      })}
      {/* The one measured value in the set, and it is labelled as one sample
        * rather than "your site speed" — the same caveat the response-time
        * check carries in its own row. */}
      <div className="print-keep">
        <p className="text-eyebrow uppercase text-indigo-600">First byte</p>
        <p className="mt-2 text-h2 font-bold tabular-nums text-ink">
          {(result.ttfbMs / 1000).toFixed(2)}
          <span className="ml-1 text-small font-medium text-slate">s</span>
        </p>
        <p className="mt-1 text-small text-slate">one request, just now</p>
      </div>
    </div>
  );
}

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
  /* The hostname the audit actually landed on, after redirects — not what was
   * typed. If it won't parse we render no deeper-checks offer at all rather
   * than one that cannot work. */
  const host = (() => {
    try {
      return new URL(result.finalUrl).hostname;
    } catch {
      return null;
    }
  })();
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
      {/* PRINT-ONLY MASTHEAD. The site header is print:hidden — correct, a
        * sticky nav is meaningless on paper — but that left the saved PDF with
        * no title, no date and nothing naming what produced it. A report a
        * visitor forwards to a client is the most durable thing this tool
        * makes, and it was arriving anonymous and undated: the on-screen line
        * below gives a time but not a day, which is fine on a page you are
        * looking at and useless on one filed for a fortnight.
        *
        * The full date is here rather than added to the screen line because on
        * screen "12:35" is obviously today; on paper nothing is. */}
      <div className="mb-8 hidden items-baseline justify-between border-b-[1.5px] border-ink pb-4 print:flex">
        <p className="font-bold text-ink">
          Website audit
          <span className="ml-2 font-normal text-slate">{result.finalUrl}</span>
        </p>
        <p className="text-small text-slate">
          {checked.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}{" "}
          · debugswift.com/tools
        </p>
      </div>

      <div className="border-b-[1.5px] border-ink pb-8">
        <p className="text-eyebrow uppercase text-indigo-600">The result</p>
        {/* Proportional figures, NOT tabular-nums. Equal-width digits exist to
          * make numbers line up in a column; on a standalone display figure
          * they just make "31" sit loose. The per-group counts below DO align
          * vertically, so those keep tabular-nums — same rule, opposite answer. */}
        <p className="mt-3 text-h1 font-bold text-ink">
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
        <SummaryTiles result={result} />
        <GroupBreakdown result={result} />
      </div>

      {CHECK_GROUPS.map((group) => {
        const rows = result.checks.filter((c) => c.group === group);
        if (!rows.length) return null;
        /* The group's own score, beside its name. Scrolling the ledger used to
         * mean losing your place in the breakdown above; now each heading
         * carries the number the bar chart drew. Counted the same way as the
         * headline and the chart — "info" rows excluded — so the three can
         * never disagree. */
        const counted = rows.filter((c) => c.status !== "info");
        const passed = counted.filter((c) => c.status === "pass").length;

        return (
          <section key={group} className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-eyebrow uppercase text-indigo-600">{group}</h3>
              {counted.length > 0 && (
                <p className="text-small tabular-nums text-slate">
                  {passed} of {counted.length}
                </p>
              )}
            </div>
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
                  {/* In print the LINK goes but the offer stays. Hiding the
                    * whole line lost the fact that a tool here already does
                    * this job — the reader of a printed report is exactly the
                    * person deciding what to act on, so telling them a fix
                    * exists is worth more than the anchor they can't tap. */}
                  {check.fixWith && (
                    <>
                      <p className="mt-3 print:hidden">
                        <Link
                          href={toolHref(check.fixWith.slug, check.fixWith.params)}
                          className="text-small font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
                        >
                          {check.fixWith.label} →
                        </Link>
                      </p>
                      <p className="mt-3 hidden text-small text-slate print:block">
                        <span className="font-medium text-ink">Fix it with: </span>
                        {check.fixWith.label} — debugswift.com/tools/
                        {check.fixWith.slug}
                      </p>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {/* The deeper checks sit BELOW our own, behind their own button, and
        * outside the score. They are somebody else's measurements of the same
        * page — useful, and not ours to fold into a number we call this tool's
        * opinion. See components/DeepChecks.tsx. */}
      {host && <DeepChecks host={host} />}
    </div>
  );
}
