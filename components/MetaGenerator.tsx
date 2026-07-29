"use client";

import { useId, useState } from "react";
import { useHasMounted } from "@/lib/hooks";
import { useParam } from "@/lib/params";
import {
  DESCRIPTION_FONT,
  DESCRIPTION_PIXEL_BUDGET,
  fitToBudget,
  TITLE_FONT,
  TITLE_PIXEL_BUDGET,
  type Fit,
} from "@/lib/meta/measure";
import {
  descriptionSuggestions,
  titleSuggestions,
  type MetaInput,
  type Suggestion,
} from "@/lib/meta/patterns";

/* The meta tag editor.
 *
 * Everything happens in this component. There is no API route, no key, and
 * nothing typed here leaves the browser — which is worth knowing because people
 * paste unpublished page copy into tools like this one.
 *
 * MEASUREMENT AND MOUNTING. lib/meta/measure.ts returns null on the server,
 * where there is no canvas. React will not re-render just because we hydrated,
 * so `measured` flips in an effect and that is what triggers the first real
 * measurement. Until then the UI shows character counts and says the pixel
 * figure is still coming — it does not show a zero, and it does not quietly
 * substitute the character count for the pixel width. They are different
 * measurements and only one of them is what Google uses. */

const EXAMPLE: MetaInput = { subject: "", business: "", location: "" };

export default function MetaGenerator() {
  /* Prefill from ?title= / ?description=, which is how the website audit hands
   * a too-long title straight over instead of telling you to retype it. The
   * params are read after mount (see lib/params.ts), so the initial state is
   * empty and the values arrive on the first client render. */
  const prefillTitle = useParam("title", 300);
  const prefillDescription = useParam("description", 600);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [seed, setSeed] = useState<MetaInput>(EXAMPLE);
  const measured = useHasMounted();

  /* Applied ONCE, adjusted during render rather than in an effect — the
   * react.dev "you might not need an effect" pattern, and the one the
   * set-state-in-effect lint rule points you at. After the first application
   * the fields belong to the visitor; re-syncing from the URL would fight
   * anyone who edits the text and then reloads the page. */
  const [applied, setApplied] = useState(false);
  if (!applied && (prefillTitle || prefillDescription)) {
    setApplied(true);
    if (prefillTitle) setTitle(prefillTitle);
    if (prefillDescription) setDescription(prefillDescription);
  }

  const titleFit = fitToBudget(title, TITLE_FONT, TITLE_PIXEL_BUDGET);
  const descFit = fitToBudget(description, DESCRIPTION_FONT, DESCRIPTION_PIXEL_BUDGET);

  const titleIdeas = titleSuggestions(seed);
  const descIdeas = descriptionSuggestions(seed);

  return (
    <div className="space-y-14">
      {/* ---------------------------------------------------------- the editor */}
      <div className="space-y-8">
        <Field
          label="Title tag"
          hint="The clickable line in search results."
          value={title}
          onChange={setTitle}
          fit={titleFit}
          measured={measured}
          rows={2}
        />
        <Field
          label="Meta description"
          hint="The sentences underneath it."
          value={description}
          onChange={setDescription}
          fit={descFit}
          measured={measured}
          rows={4}
        />
      </div>

      {/* --------------------------------------------------------- the preview */}
      <div>
        <p className="text-eyebrow uppercase text-indigo-600">
          Roughly how it lands
        </p>
        <div className="mt-4 rounded-card border-[1.5px] border-ink bg-paper p-6">
          {title || description ? (
            <>
              <p className="text-small text-slate">yoursite.com &rsaquo; page</p>
              <p className="mt-1 text-h3 font-medium leading-snug">
                <Truncated fit={titleFit} full={title} />
              </p>
              <p className="mt-2 text-slate">
                <Truncated fit={descFit} full={description} />
              </p>
            </>
          ) : (
            <p className="text-slate">
              Type a title above and this fills in.
            </p>
          )}
        </div>
        <p className="mt-4 max-w-2xl text-small text-slate">
          Faded text is the part that gets cut off. Measured in Arial at
          Google&apos;s desktop sizes, so treat the cut-off point as close rather
          than exact — and remember Google rewrites titles it doesn&apos;t like,
          whatever length they are.
        </p>
      </div>

      {/* ------------------------------------------------------ starting points */}
      <div className="border-t-[1.5px] border-mist pt-10">
        <p className="text-eyebrow uppercase text-indigo-600">
          Need a starting point?
        </p>
        <p className="mt-3 max-w-2xl text-slate">
          Fill these in and you&apos;ll get drafts built from the usual shapes —
          specific thing first, business name last, because the end of the line is
          what gets cut. There&apos;s no AI here, and nothing you type is sent
          anywhere. Edit whatever you pick.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <SeedField
            label="What's this page about?"
            placeholder="Emergency plumbing repairs"
            value={seed.subject}
            onChange={(subject) => setSeed((s) => ({ ...s, subject }))}
          />
          <SeedField
            label="Business name"
            placeholder="Ganguly Plumbing"
            value={seed.business}
            onChange={(business) => setSeed((s) => ({ ...s, business }))}
          />
          <SeedField
            label="Town or area (optional)"
            placeholder="Salt Lake"
            value={seed.location}
            onChange={(location) => setSeed((s) => ({ ...s, location }))}
          />
        </div>

        {titleIdeas.length > 0 && (
          <div className="mt-10 space-y-8">
            <IdeaList
              heading="Title drafts"
              ideas={titleIdeas}
              font={TITLE_FONT}
              budget={TITLE_PIXEL_BUDGET}
              measured={measured}
              onUse={setTitle}
            />
            <IdeaList
              heading="Description drafts"
              ideas={descIdeas}
              font={DESCRIPTION_FONT}
              budget={DESCRIPTION_PIXEL_BUDGET}
              measured={measured}
              onUse={setDescription}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- pieces */

function Field({
  label,
  hint,
  value,
  onChange,
  fit,
  measured,
  rows,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  fit: Fit;
  measured: boolean;
  rows: number;
}) {
  const id = useId();
  const over = fit.truncated;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <label htmlFor={id} className="font-medium text-ink">
          {label}
        </label>
        <p
          className={`text-small tabular-nums ${over ? "text-clay-700" : "text-slate"}`}
        >
          {measured && fit.width !== null ? (
            <>
              {fit.width}px of {fit.budget}px
              {over && " — being cut"}
            </>
          ) : (
            <>measuring…</>
          )}
          <span className="text-slate"> · {value.length} characters</span>
        </p>
      </div>
      <p className="mt-1 text-small text-slate">{hint}</p>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck
        className="mt-3 w-full resize-y rounded-card border-[1.5px] border-ink bg-paper px-5 py-3 text-ink placeholder:text-stone"
      />
      {/* The meter fills Indigo whether or not the line fits — over-budget is
       * said in words and shown in the preview, because a clay FILL here would
       * put a clay background in the view and blow the ration. */}
      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-mist"
        role="presentation"
      >
        <div
          className="h-full bg-indigo-500 transition-[width] duration-200 ease-out"
          style={{
            width:
              measured && fit.width !== null
                ? `${Math.min((fit.width / fit.budget) * 100, 100)}%`
                : "0%",
          }}
        />
      </div>
    </div>
  );
}

/* The faded tail is the ONE deliberate use of Stone for text in this repo.
 *
 * Stone on Cream measures 2.24:1, which fails WCAG AA at every text size — so
 * it is not used for content anywhere else here; substantive small text is
 * Slate (6.19:1). The exception holds because this span's low contrast IS the
 * information: it depicts the part of the title Google will not show. No
 * meaning is lost by it being hard to read, because the same characters sit in
 * full-contrast form in the textarea directly above, and the numeric readout
 * states the overflow independently.
 *
 * If that pairing is ever broken — this preview shown without the input beside
 * it — this has to change. */
function Truncated({ fit, full }: { fit: Fit; full: string }) {
  if (!full) return <span className="text-slate">—</span>;
  if (!fit.truncated) return <>{full}</>;
  return (
    <>
      {fit.visible}
      <span className="text-stone">
        {"…"}
        {full.slice(fit.visible.length)}
      </span>
    </>
  );
}

function SeedField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-small font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-card border-[1.5px] border-ink bg-paper px-4 py-2.5 text-ink placeholder:text-stone"
      />
    </div>
  );
}

function IdeaList({
  heading,
  ideas,
  font,
  budget,
  measured,
  onUse,
}: {
  heading: string;
  ideas: Suggestion[];
  font: string;
  budget: number;
  measured: boolean;
  onUse: (text: string) => void;
}) {
  if (!ideas.length) return null;

  return (
    <div>
      <h3 className="font-medium text-ink">{heading}</h3>
      <ul className="mt-4 divide-y-[1.5px] divide-mist border-y-[1.5px] border-mist">
        {ideas.map((idea) => {
          const fit = fitToBudget(idea.text, font, budget);
          return (
            <li
              key={idea.text}
              className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="break-words text-ink">{idea.text}</p>
                <p className="mt-1 text-small text-slate">{idea.note}</p>
                <p className="mt-1 text-small tabular-nums text-slate">
                  {measured && fit.width !== null
                    ? `${fit.width}px${fit.truncated ? " — would be cut" : ""}`
                    : "measuring…"}
                </p>
              </div>
              {/* Tertiary, not a pill: several of these in one view, and the
               * page's one clay element belongs to the CTA band. */}
              <button
                type="button"
                onClick={() => onUse(idea.text)}
                className="shrink-0 font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
              >
                Use this →
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
