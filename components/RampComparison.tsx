import Card from "@/components/Card";
import {
  parseHex,
  RAMP_STEPS,
  rgbToOklch,
  STEP_LIGHTNESS,
  toHex,
  buildRamp,
  type Rgb,
} from "@/lib/brand/color";

/* HSL vs OKLCh, shown rather than described.
 *
 * The brand-kit page used to explain this in three paragraphs of prose on a
 * page whose entire subject is colour. This is the one slot in the app where a
 * figure is not decoration — the claim IS visual, and asking someone to take it
 * on trust is the weakest possible version of it.
 *
 * WHAT IS ACTUALLY BEING CLAIMED, precisely, because a sloppier version of this
 * would be a lie: it is NOT "OKLCh steps are even and HSL's are not". The
 * tool's own targets (STEP_LIGHTNESS) are a deliberate curve, not a uniform
 * walk. The claim is narrower and true: ASK FOR A LIGHTNESS AND OKLCH GIVES YOU
 * THAT LIGHTNESS. HSL does not — you get a number that agrees with the label
 * and a colour that does not.
 *
 * So both rows below are built from the SAME ten targets, imported from the
 * same constant the real tool uses rather than re-typed here (a copy would
 * drift the first time the curve is tuned). Each swatch is then measured back
 * into OKLCh, and what is printed is the gap between what was asked for and
 * what arrived. Every number on screen is measured from the swatch beside it.
 *
 * Seeded with Indigo 500 — the brand's dominant colour, and ten clay swatches
 * would blow the ≤2% ration on their own. */

/** HSL → RGB, the textbook conversion. Not in lib/brand/color.ts because the
 *  tool itself has no reason to ever work in HSL; it exists here only to build
 *  the thing being argued against. Sanity-checked against the canonical values:
 *  hsl(0,100%,50%) is #ff0000 and hsl(120,100%,25%) is #008000. */
function hslToRgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0]
    : hp < 2 ? [x, c, 0]
    : hp < 3 ? [0, c, x]
    : hp < 4 ? [0, x, c]
    : hp < 5 ? [x, 0, c]
    : [c, 0, x];
  const m = l - c / 2;
  return { r: r1 + m, g: g1 + m, b: b1 + m };
}

/** RGB → HSL, enough of it to read the seed's hue and saturation. */
function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  if (d === 0) return { h: 0, s: 0 };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === r ? 60 * (((g - b) / d) % 6)
    : max === g ? 60 * ((b - r) / d + 2)
    : 60 * ((r - g) / d + 4);
  return { h: ((h % 360) + 360) % 360, s };
}

const SEED = "#6467f2";

type Row = { hex: string; asked: number; got: number };

function buildRows(): { oklch: Row[]; hsl: Row[] } {
  const base = parseHex(SEED)!;
  const { h, s } = rgbToHsl(base);

  const oklchSwatches = buildRamp(base);
  const oklch: Row[] = RAMP_STEPS.map((step, i) => {
    const hex = oklchSwatches[i]!.hex;
    return {
      hex,
      asked: STEP_LIGHTNESS[step]!,
      /* Measured back off the ROUNDED output hex, not the float it came from —
       * 8-bit rounding is part of what you actually get. */
      got: rgbToOklch(parseHex(hex)!).l,
    };
  });

  const hsl: Row[] = RAMP_STEPS.map((step) => {
    const asked = STEP_LIGHTNESS[step]!;
    const hex = toHex(hslToRgb(h, s, asked));
    return { hex, asked, got: rgbToOklch(parseHex(hex)!).l };
  });

  return { oklch, hsl };
}

function worstDrift(rows: Row[]): number {
  return Math.max(...rows.map((r) => Math.abs(r.got - r.asked)));
}

function Strip({
  label,
  note,
  rows,
}: {
  label: string;
  note: string;
  rows: Row[];
}) {
  return (
    <div>
      <p className="text-eyebrow uppercase text-indigo-600">{label}</p>
      <div className="mt-3 flex gap-1.5">
        {rows.map((row) => (
          <div key={row.hex + row.asked} className="flex-1">
            <div
              className="h-14 rounded-[6px] border-[1.5px] border-ink"
              style={{ backgroundColor: row.hex }}
            />
            {/* Hidden below sm. At 390px ten swatches are 25px wide and the
              * figure under them is 22px — legible only in the sense that the
              * pixels are present. Nothing is lost: the sentence below each
              * strip states the same measurement in words, so the claim still
              * stands up on a phone and the per-swatch numbers become an
              * enhancement where there is room to read them. */}
            <p className="mt-2 hidden text-center text-[11px] leading-none tabular-nums text-slate sm:block">
              {row.got.toFixed(2)}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-small text-slate">{note}</p>
    </div>
  );
}

export default function RampComparison() {
  const { oklch, hsl } = buildRows();
  const oklchDrift = worstDrift(oklch);
  const hslDrift = worstDrift(hsl);

  return (
    /* Card, not a hand-rolled equivalent. It was in this repo imported by
     * nothing — copied over with the shared component set and never used. The
     * fix is to use it rather than delete it: the repo's rule is that these
     * components stay in step with the marketing repo's, so removing one to
     * tidy up dead code would fork the set instead. */
    <Card className="md:p-8">
      <div className="space-y-8">
        <Strip
          label="Asked in HSL"
          rows={hsl}
          /* Three decimals in both notes on purpose. At two, OKLCh's drift
           * rounds to "0.00", which reads as a placeholder rather than a
           * result — and the whole point of the figure is that these are real
           * measurements. */
          note={`Same ten targets. The worst step lands ${hslDrift.toFixed(3)} away from the lightness it was given — which is why the middle of an HSL ramp goes muddy while the numbers still look tidy.`}
        />
        <Strip
          label="Asked in OKLCh"
          rows={oklch}
          note={`The same ten targets, off by at most ${oklchDrift.toFixed(3)}. This is the ramp the tool builds.`}
        />
      </div>
      <p className="mt-8 border-t-[1.5px] border-mist pt-5 text-small text-slate">
        <span className="hidden sm:inline">
          The figure under each swatch is its perceptual lightness, measured
          back out of the colour above it.{" "}
        </span>
        Both rows were built from the same ten targets and the same starting
        colour — {SEED}.
      </p>
    </Card>
  );
}
