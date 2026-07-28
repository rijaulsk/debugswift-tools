"use client";

import { useState } from "react";
import {
  estimate,
  GOTCHAS,
  KINDS,
  optionsFor,
  THEY_WILL_ASK,
  toBrief,
  type ProjectKind,
} from "@/lib/scope/model";

/* The scoper.
 *
 * NO PRICES. See the header of lib/scope/model.ts — that is a locked decision
 * from the brief, not an oversight, and the page states it rather than leaving
 * the visitor wondering why a tool called a cost estimator never mentions cost.
 *
 * The build-time range is arithmetic the visitor performed: every line shows the
 * days it contributed, so the total is auditable on screen. Nothing is summed
 * behind their back.
 */

export default function ProjectScoper() {
  const [kind, setKind] = useState<ProjectKind>("website");
  const [chosen, setChosen] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  /* No useMemo here on purpose. These are array filters over ten items and a
   * sum — cheaper than the bookkeeping a memo would cost — and the React
   * Compiler refuses to optimise a component whose manual memoization it can't
   * preserve, so a useMemo would have opted this whole component out of
   * compilation to save nothing. */
  const options = optionsFor(kind);
  const est = estimate(kind, chosen);
  const base = KINDS.find((k) => k.id === kind)!;

  const toggle = (id: string) =>
    setChosen((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const switchKind = (next: ProjectKind) => {
    setKind(next);
    /* Options are per-kind; keeping ids that don't apply would silently drop
     * them from the total while leaving them ticked in the visitor's head. */
    setChosen((prev) =>
      prev.filter((id) => optionsFor(next).some((o) => o.id === id)),
    );
  };

  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(toBrief(kind, chosen));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-12">
      <fieldset className="border-0 p-0">
        <legend className="text-eyebrow uppercase text-indigo-600">
          What are you building?
        </legend>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              aria-pressed={kind === k.id}
              onClick={() => switchKind(k.id)}
              className={`rounded-card border-[1.5px] border-ink p-4 text-left transition duration-200 ease-out ${
                kind === k.id ? "bg-ink text-cream" : "bg-paper hover:bg-sand"
              }`}
            >
              <span className="font-medium">{k.label}</span>
              <span
                className={`mt-1 block text-small ${kind === k.id ? "text-mist" : "text-slate"}`}
              >
                {k.blurb}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="border-0 p-0">
        <legend className="text-eyebrow uppercase text-indigo-600">
          Which of these are true?
        </legend>
        <p className="mt-3 max-w-2xl text-slate">
          Tick what applies. Each one shows the build days it adds, so the total
          at the bottom is something you can check rather than take on trust.
        </p>
        <ul className="mt-6 divide-y-[1.5px] divide-mist border-y-[1.5px] border-mist">
          {options.map((o) => {
            const on = chosen.includes(o.id);
            return (
              <li key={o.id}>
                <label className="flex cursor-pointer items-start gap-4 py-4">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(o.id)}
                    className="mt-1 h-5 w-5 shrink-0 accent-indigo-500"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-ink">{o.label}</span>
                    <span className="mt-1 block text-small text-slate">{o.note}</span>
                  </span>
                  <span className="shrink-0 text-small tabular-nums text-slate">
                    +{o.days} days
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {/* ------------------------------------------------------------ result */}
      <div className="rounded-card border-[1.5px] border-ink bg-paper p-6">
        <p className="text-eyebrow uppercase text-indigo-600">Roughly how long</p>
        <p className="mt-3 text-h2 font-bold tabular-nums text-ink">
          {est.lowWeeks}–{est.highWeeks} weeks
        </p>
        <p className="mt-3 text-small tabular-nums text-slate">
          {base.baseDays} days for {base.label.toLowerCase()}
          {est.chosen.map((o) => ` + ${o.days} for ${o.label.toLowerCase()}`)} ={" "}
          {est.totalDays} days, then ±25% because a single figure is a promise
          nobody can keep.
        </p>
        <p className="mt-4 max-w-2xl text-slate">
          That is how long <span className="text-ink">we</span> would budget for
          this, working from the list above. It is not a survey of what anyone
          else takes, and it is not a quote.
        </p>
      </div>

      {/* ------------------------------------------------------------- brief */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-eyebrow uppercase text-indigo-600">Your brief</h2>
          <button
            type="button"
            onClick={copyBrief}
            className="font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
          >
            {copied ? "Copied" : "Copy the brief"}
          </button>
        </div>
        <p className="mt-3 max-w-2xl text-slate">
          Send this to everyone you ask. Three quotes are only comparable if all
          three were asked the same question — which is usually the real reason
          they come back so far apart.
        </p>
        <pre className="mt-5 overflow-x-auto rounded-card border-[1.5px] border-ink bg-paper p-5 text-small">
          <code className="text-ink">{toBrief(kind, chosen)}</code>
        </pre>
      </div>

      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="text-eyebrow uppercase text-indigo-600">
            What usually changes the price
          </h2>
          <ul className="mt-4 space-y-3">
            {GOTCHAS.map((g) => (
              <li key={g} className="flex gap-3 text-slate">
                <span aria-hidden="true" className="text-indigo-600">
                  —
                </span>
                {g}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-eyebrow uppercase text-indigo-600">
            What they&apos;ll ask you
          </h2>
          <ul className="mt-4 space-y-3">
            {THEY_WILL_ASK.map((q) => (
              <li key={q} className="flex gap-3 text-slate">
                <span aria-hidden="true" className="text-indigo-600">
                  —
                </span>
                {q}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
