/* What the audit shows while it is running.
 *
 * It showed one line of grey text — "Fetching the page and running the checks…"
 * — for a wait of three to twenty seconds, which is long enough that a visitor
 * starts wondering whether the button worked. Then the whole report appeared at
 * once and shoved the page down.
 *
 * This is the case a skeleton is actually for, per design system §10: the shape
 * is known (a score, a set of group bars, a stat row) and the content is
 * genuinely coming. Compare the two other patterns, which would both be wrong
 * here. A bar says "something is happening" and nothing about what — right for
 * a navigation, where nothing can be drawn yet. A spinner centres attention on
 * the waiting itself.
 *
 * Determinate, named steps would be better still, and are not available: the
 * API answers in one POST, so the client cannot know which of the checks is
 * running. If that ever streams, this should become a list ticking itself off,
 * and that would be an upgrade rather than a rewrite.
 *
 * THE BOXES MATCH AuditReport'S. That is the whole discipline of a skeleton —
 * one that guesses causes the layout shift it exists to prevent. If the report
 * header changes shape, change this with it.
 *
 * aria-hidden, with the real message left to the live region that wraps this:
 * a screen reader should hear "running the checks", not a description of five
 * grey rectangles. */

const GROUPS = 4;
const STATS = 4;

export default function AuditSkeleton() {
  return (
    <div aria-hidden="true">
      {/* The score block: eyebrow, the big "N of M", the paragraph under it. */}
      <div className="border-b-[1.5px] border-ink pb-8">
        <div className="skeleton h-4 w-28" />
        <div className="skeleton mt-3 h-12 w-64" />
        <div className="skeleton mt-4 h-4 w-full max-w-2xl" />
        <div className="skeleton mt-2 h-4 w-full max-w-xl" />
      </div>

      {/* "Where it went" — a label, a bar and a count per group. */}
      <div className="mt-8">
        <div className="skeleton h-4 w-32" />
        <ul className="mt-4 space-y-3">
          {Array.from({ length: GROUPS }, (_, i) => (
            <li
              key={i}
              className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[11rem_1fr_4.5rem]"
            >
              <div className="skeleton h-4 w-28 sm:order-1" />
              <div className="skeleton justify-self-end h-4 w-10 sm:order-3" />
              <div className="skeleton col-span-2 h-2 sm:order-2 sm:col-span-1" />
            </li>
          ))}
        </ul>
      </div>

      {/* The stat row: four figures on desktop, two columns on a phone. */}
      <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
        {Array.from({ length: STATS }, (_, i) => (
          <div key={i}>
            <div className="skeleton h-4 w-24" />
            <div className="skeleton mt-2 h-9 w-20" />
            <div className="skeleton mt-1 h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
