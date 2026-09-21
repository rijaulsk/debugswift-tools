"use client";

import { useMemo, useState } from "react";
import type { ToolGroup } from "@/lib/tools";

/* The filter shell around the hub's tool cards.
 *
 * WHY THE CARDS ARE CHILDREN AND NOT DATA. Every card contains a ToolVisual —
 * a flat artifact of the tool's own output, twenty-odd elements each. Rendering
 * those here would make this client component own nine artifacts' worth of
 * markup and ship all of it as JavaScript. Instead the server renders the cards
 * and hands them over, and this component only decides which ones are shown.
 * Filtering hides them with `hidden` rather than unmounting, so nothing
 * re-renders and no artifact is ever rebuilt.
 *
 * WHY NO LOADING STATE. Filtering is a class toggle on markup that is already
 * in the DOM; it lands in one frame. A skeleton or spinner here would be
 * slower than the thing it was covering. See design system §11: under about
 * 100ms, use nothing.
 *
 * The search input is `type="search"` so a phone keyboard offers the right
 * layout and the browser gives its own clear button. No submit, no debounce
 * needed, no results page. */

export type RackItem = {
  slug: string;
  group: ToolGroup;
  /** Lowercased name + description, matched against the query. Built on the
   *  server so the client never re-derives it. */
  haystack: string;
  card: React.ReactNode;
};

export default function ToolRack({
  items,
  groups,
}: {
  items: RackItem[];
  groups: { key: ToolGroup; label: string }[];
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<ToolGroup | null>(null);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (group && item.group !== group) continue;
      if (q && !item.haystack.includes(q)) continue;
      set.add(item.slug);
    }
    return set;
  }, [items, group, q]);

  const chipBase =
    "rounded-full border-[1.5px] px-4 py-1.5 text-small font-medium transition duration-200 ease-out";
  const chipOff =
    "border-mist text-slate hover:border-ink hover:text-ink";
  /* Ink, not clay: the CTA band at the foot of this page owns the page's one
   * clay element, and a row of clay chips would blow the ration outright. */
  const chipOn = "border-ink bg-ink text-cream";

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap justify-center gap-2 md:justify-start">
          <button
            type="button"
            onClick={() => setGroup(null)}
            aria-pressed={group === null}
            className={`${chipBase} ${group === null ? chipOn : chipOff}`}
          >
            Everything
          </button>
          {groups.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setGroup(group === key ? null : key)}
              aria-pressed={group === key}
              className={`${chipBase} ${group === key ? chipOn : chipOff}`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="md:w-[260px]">
          <span className="sr-only">Search the tools</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the tools"
            className="w-full rounded-full border-[1.5px] border-mist bg-paper px-4 py-2 text-small text-ink transition-colors duration-200 ease-out placeholder:text-slate hover:border-ink focus:border-ink focus:outline-none"
          />
        </label>
      </div>

      {/* aria-live so a screen-reader user hears the count change; the grid
       * itself is not announced, because nothing moved — rows were hidden. */}
      <p className="sr-only" aria-live="polite">
        {visible.size} of {items.length} tools shown
      </p>

      <ul className="mt-8 grid gap-6 md:grid-cols-2">
        {/* BOTH the attribute and the class, deliberately. The `hidden`
         * attribute takes it out of the accessibility tree and out of tab
         * order, which is the part that matters; the class is what actually
         * hides it, because any Tailwind display utility elsewhere on the
         * element would override the UA stylesheet's `display: none`. */}
        {items.map((item) => (
          <li
            key={item.slug}
            hidden={!visible.has(item.slug)}
            className={visible.has(item.slug) ? undefined : "hidden"}
          >
            {item.card}
          </li>
        ))}
      </ul>

      {visible.size === 0 && (
        <p className="mt-10 text-center text-slate md:text-left">
          Nothing matches {q ? `"${query.trim()}"` : "that filter"}. The tools
          are all free, so the fastest thing is usually to clear the search and
          look down the list.
        </p>
      )}
    </div>
  );
}
