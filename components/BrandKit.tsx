"use client";

import { useId, useMemo, useState } from "react";
import {
  buildRamp,
  formatRatio,
  parseHex,
  type Swatch,
} from "@/lib/brand/color";
import { buildScale, normaliseBase, RATIOS } from "@/lib/brand/scale";

/* The brand kit builder.
 *
 * A DESIGN-SYSTEM NOTE, so a review doesn't flag this as a token violation:
 * this component renders arbitrary hex colours the visitor supplied. Those
 * swatches are DATA, the same way the audit echoes a stranger's title tag —
 * they are not the site's own palette, and the "colours only from the token
 * tables" rule doesn't reach them. Every piece of chrome around them (labels,
 * borders, body text, the CTA) is on-token. If you ever find yourself styling
 * this page's furniture with a generated colour, that IS the violation.
 *
 * WHAT IS MEASURED AND WHAT IS CHOSEN, which the UI states rather than implies:
 * contrast ratios are computed from the actual output hex per WCAG 2.1, and are
 * facts. The ten lightness targets and the line-height suggestions are this
 * tool's opinion. Keeping the two visibly separate is the whole reason this is
 * a DebugSwift tool and not another palette toy.
 */

const DEFAULT_HEX = "#2f6f4f";

export default function BrandKit() {
  const [hexInput, setHexInput] = useState(DEFAULT_HEX);
  const [basePx, setBasePx] = useState("18");
  const [ratio, setRatio] = useState(1.25);

  const parsed = parseHex(hexInput);
  const ramp = useMemo(() => (parsed ? buildRamp(parsed) : null), [parsed]);
  const base = normaliseBase(basePx);
  const scale = useMemo(() => buildScale(base, ratio), [base, ratio]);

  const hexId = useId();
  const baseId = useId();

  return (
    <div className="space-y-16">
      {/* ------------------------------------------------------------ inputs */}
      <div className="grid gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor={hexId} className="font-medium text-ink">
            Your brand colour
          </label>
          <p className="mt-1 text-small text-slate">
            A hex code. Everything below is built from this one value.
          </p>
          <div className="mt-3 flex gap-3">
            <input
              id={hexId}
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              spellCheck={false}
              className="w-full rounded-card border-[1.5px] border-ink bg-paper px-5 py-3 font-medium text-ink"
            />
            {/* The native picker, labelled for anyone not using a mouse. */}
            <label className="sr-only" htmlFor={`${hexId}-picker`}>
              Pick your brand colour visually
            </label>
            <input
              id={`${hexId}-picker`}
              type="color"
              value={parsed ? hexInput.trim().padEnd(7, "0").slice(0, 7) : DEFAULT_HEX}
              onChange={(e) => setHexInput(e.target.value)}
              className="h-[52px] w-16 shrink-0 cursor-pointer rounded-card border-[1.5px] border-ink bg-paper p-1"
            />
          </div>
          {!parsed && (
            <p className="mt-2 text-small text-clay-700">
              That isn&apos;t a hex colour. Try something like #2f6f4f.
            </p>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- ramp */}
      {ramp && (
        <section>
          <h2 className="text-eyebrow uppercase text-indigo-600">The palette</h2>
          <p className="mt-3 max-w-2xl text-slate">
            Ten steps built by walking perceptual lightness, so the gaps look
            even rather than measuring even. Each row says which text colour is
            legible on it — measured, not guessed.
          </p>

          <ul className="mt-6 divide-y-[1.5px] divide-mist border-y-[1.5px] border-mist">
            {ramp.map((swatch) => (
              <SwatchRow key={swatch.step} swatch={swatch} />
            ))}
          </ul>

          <p className="mt-6 max-w-2xl text-small text-slate">
            Ratios are WCAG 2.1 contrast, computed on the hex above. AA wants 4.5
            for body text and 3 for large text — 24px and up, or 19px and up if
            it&apos;s bold. A step with neither black nor white passing is a
            background for shapes, not for words.
          </p>
        </section>
      )}

      {/* ------------------------------------------------------------ scale */}
      <section>
        <h2 className="text-eyebrow uppercase text-indigo-600">The type scale</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <label htmlFor={baseId} className="text-small font-medium text-ink">
              Body size in pixels
            </label>
            <input
              id={baseId}
              type="number"
              min={12}
              max={24}
              value={basePx}
              onChange={(e) => setBasePx(e.target.value)}
              className="mt-2 w-full rounded-card border-[1.5px] border-ink bg-paper px-4 py-2.5 text-ink"
            />
          </div>
          <fieldset className="border-0 p-0">
            <legend className="text-small font-medium text-ink">Ratio</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {RATIOS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  aria-pressed={ratio === r.value}
                  onClick={() => setRatio(r.value)}
                  title={r.note}
                  className={`rounded-full border-[1.5px] px-4 py-2 text-small font-medium transition duration-200 ease-out ${
                    ratio === r.value
                      ? "border-ink bg-ink text-cream"
                      : "border-ink text-ink hover:bg-sand"
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
            <p className="mt-2 text-small text-slate">
              {RATIOS.find((r) => r.value === ratio)?.note}
            </p>
          </fieldset>
        </div>

        <ul className="mt-8 divide-y-[1.5px] divide-mist border-y-[1.5px] border-mist">
          {scale.map((step) => (
            <li
              key={step.name}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 py-4"
            >
              <span
                className="min-w-0 flex-1 truncate text-ink"
                style={{ fontSize: `${step.px}px`, lineHeight: step.lineHeight }}
              >
                {step.name}
              </span>
              <span className="shrink-0 text-small tabular-nums text-slate">
                {step.px}px · {step.rem}rem · {step.lineHeight}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------------ output */}
      {ramp && (
        <section>
          <h2 className="text-eyebrow uppercase text-indigo-600">
            Take it with you
          </h2>
          <p className="mt-3 max-w-2xl text-slate">
            Paste this straight into your stylesheet. Nothing here needs a build
            step or a library.
          </p>
          <CodeBlock
            label="CSS custom properties"
            code={cssOutput(ramp, base, ratio)}
          />
          <CodeBlock
            label="Tailwind v4 theme"
            code={tailwindOutput(ramp)}
          />
        </section>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- rows */

function SwatchRow({ swatch }: { swatch: Swatch }) {
  const { step, hex, onWhite, onBlack, bestBodyText, largeTextOk } = swatch;

  return (
    <li className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4">
      {/* The one place a non-token colour is legitimate: it IS the data. The
       * ink border keeps the chip on-brand regardless of what's inside it. */}
      <div
        className="h-14 w-20 shrink-0 rounded-card border-[1.5px] border-ink"
        style={{ backgroundColor: hex }}
        role="img"
        aria-label={`Step ${step}, ${hex}`}
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium tabular-nums text-ink">
          {step}
          <span className="ml-3 font-normal uppercase text-slate">{hex}</span>
        </p>
        <p className="mt-1 text-small tabular-nums text-slate">
          Black {formatRatio(onBlack)} · White {formatRatio(onWhite)}
        </p>
      </div>
      <p className="text-small text-slate sm:w-56 sm:text-right">
        {bestBodyText ? (
          <>
            <span className="font-medium text-ink">{bestBodyText}</span> text
            passes AA here
          </>
        ) : largeTextOk ? (
          <>
            Large text only —{" "}
            <span className="font-medium text-ink">{largeTextOk}</span>, 24px and
            up
          </>
        ) : (
          <span className="text-clay-700">No text colour passes on this</span>
        )}
      </p>
    </li>
  );
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard blocked (insecure context, or a permissions policy). The
       * code is on screen and selectable, so there is nothing to recover
       * from — but never claim it copied when it didn't. */
      setCopied(false);
    }
  };

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="font-medium text-ink">{label}</p>
        <button
          type="button"
          onClick={copy}
          className="font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="mt-3 overflow-x-auto rounded-card border-[1.5px] border-ink bg-paper p-5 text-small">
        <code className="text-ink">{code}</code>
      </pre>
    </div>
  );
}

/* ------------------------------------------------------------------ output */

function cssOutput(ramp: Swatch[], base: number, ratio: number): string {
  const colors = ramp.map((s) => `  --brand-${s.step}: ${s.hex};`).join("\n");
  const type = buildScale(base, ratio)
    .map(
      (s) =>
        `  --text-${slug(s.name)}: ${s.rem}rem;\n  --leading-${slug(s.name)}: ${s.lineHeight};`,
    )
    .join("\n");
  return `:root {\n${colors}\n\n${type}\n}`;
}

function tailwindOutput(ramp: Swatch[]): string {
  const colors = ramp.map((s) => `  --color-brand-${s.step}: ${s.hex};`).join("\n");
  return `@theme {\n${colors}\n}`;
}

const slug = (name: string) => name.toLowerCase().replace(/\s+/g, "-");
