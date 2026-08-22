import type { ReactNode } from "react";

export type LedgerItem = { title: string; body: ReactNode };

/* The ledger list — a ledger GUTTER, not a stepper.
 *
 * PORTED VERBATIM FROM E:\debugswift\components\LedgerList.tsx. This repo had
 * been hand-rolling a weaker version of it inline on the audit page: slate
 * numerals in a divide-y list, which is a table of rows rather than a ledger.
 * The real component is one of the design system's named section archetypes
 * (§4), so re-implementing it locally meant the two deployments drew the same
 * idea two different ways.
 *
 * From the original, and the reason it looks like this: the old version used
 * filled indigo circles with white numerals, which read as the generic "1-2-3
 * steps" card everyone ships. This is an accountant's ledger instead — tabular
 * two-digit numerals in a right-aligned gutter against a continuous hairline
 * rule. It matches the component's name and the brand's "itemised, no
 * surprises" voice, and it looks made rather than templated.
 *
 * The rule is continuous because each row's spacing lives INSIDE the bordered
 * content block (pb), so the borders touch. */
export default function LedgerList({
  items,
  dark = false,
  lead,
}: {
  items: LedgerItem[];
  dark?: boolean;
  /* Optional fixed-width lead label per item (e.g. "Day 1") folded into title. */
  lead?: string[];
}) {
  return (
    <ol className="relative">
      {items.map(({ title, body }, i) => (
        <li key={title} className="grid grid-cols-[2.25rem_1fr]">
          <span
            aria-hidden="true"
            className={`pr-4 pt-px text-right text-body font-bold tabular-nums leading-8 ${
              dark ? "text-indigo-400" : "text-indigo-600"
            }`}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <div
            className={`border-l-[1.5px] pb-9 pl-5 last:pb-0 ${
              dark ? "border-indigo-700" : "border-indigo-200"
            }`}
          >
            <h3 className={`font-bold ${dark ? "text-cream" : "text-ink"}`}>
              {lead?.[i] ? `${lead[i]} — ` : ""}
              {title}
            </h3>
            <p className={`mt-1.5 ${dark ? "text-mist" : "text-slate"}`}>
              {body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
