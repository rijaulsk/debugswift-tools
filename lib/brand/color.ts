/* Colour maths, from scratch.
 *
 * WHY OKLAB AND NOT HSL. The obvious way to build a palette ramp is to hold
 * hue and saturation and walk HSL's lightness. It is also why so many generated
 * palettes look wrong: HSL's "lightness" is not perceptual. Pure yellow and
 * pure blue both sit at L=50% and one of them is blinding while the other is
 * nearly black, so a ramp built that way has muddy, uneven middles and steps
 * that are visibly closer together at one end.
 *
 * OKLab (Björn Ottosson, 2020) is built so that equal steps in L look like
 * equal steps to a human eye. Walking L in OKLCh gives a ramp whose steps are
 * evenly spaced to look at, which is the entire job. The transform is about
 * forty lines of arithmetic and no dependency, which is the other reason.
 *
 * WHAT IS MEASURED VS WHAT IS CHOSEN, because the tool says so on screen:
 *   - Contrast ratios are MEASURED. WCAG 2.1's relative-luminance formula,
 *     computed on the actual output colours. Those numbers are facts.
 *   - The ten lightness targets are CHOSEN. They are this tool's opinion of a
 *     useful ramp, not a standard.
 *
 * The matrices below are Ottosson's published constants. Verified against his
 * reference values in the repo's colour check — do not "tidy" the digits.
 */

export type Rgb = { r: number; g: number; b: number };
export type Oklch = { l: number; c: number; h: number };

/* ------------------------------------------------------------------- parsing */

/** Parse #rgb / #rrggbb (with or without the hash). null when it isn't one. */
export function parseHex(input: string): Rgb | null {
  const hex = input.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) return null;
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : hex;
  return {
    r: parseInt(full.slice(0, 2), 16) / 255,
    g: parseInt(full.slice(2, 4), 16) / 255,
    b: parseInt(full.slice(4, 6), 16) / 255,
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const channel = (v: number) =>
    Math.round(Math.min(Math.max(v, 0), 1) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/* ------------------------------------------------------- transfer functions */

const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

const fromLinear = (c: number) =>
  c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

/* --------------------------------------------------------------- sRGB ↔ OKLab */

export function rgbToOklch({ r, g, b }: Rgb): Oklch {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const c = Math.sqrt(A * A + B * B);
  /* Hue is undefined for a grey; 0 is as good as anything and keeps the ramp
   * from producing NaN when someone types #808080. */
  const h = c < 1e-7 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;

  return { l: L, c, h };
}

export function oklchToRgb({ l, c, h }: Oklch): Rgb {
  const rad = (h * Math.PI) / 180;
  const A = c * Math.cos(rad);
  const B = c * Math.sin(rad);

  const l_ = l + 0.3963377774 * A + 0.2158037573 * B;
  const m_ = l - 0.1055613458 * A - 0.0638541728 * B;
  const s_ = l - 0.0894841775 * A - 1.291485548 * B;

  const L = l_ * l_ * l_;
  const M = m_ * m_ * m_;
  const S = s_ * s_ * s_;

  return {
    r: fromLinear(4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S),
    g: fromLinear(-1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S),
    b: fromLinear(-0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S),
  };
}

/** Does this OKLCh colour survive the trip to sRGB without being clipped? */
function inGamut({ l, c, h }: Oklch): boolean {
  const { r, g, b } = oklchToRgb({ l, c, h });
  const eps = 1e-4;
  return (
    r >= -eps && r <= 1 + eps && g >= -eps && g <= 1 + eps && b >= -eps && b <= 1 + eps
  );
}

/**
 * Pull chroma down until the colour is displayable.
 *
 * The alternative — computing the colour and clamping each channel to 0–1 — is
 * what produces the flat, wrong-hued ends you see on a lot of generated ramps:
 * clipping one channel shifts the hue of the result. Reducing chroma keeps the
 * hue and the lightness and gives up only the saturation that was never
 * displayable in the first place, which is the honest thing to lose.
 *
 * Binary search, 20 iterations, which is far past the precision of an 8-bit
 * channel.
 */
function clampToGamut(color: Oklch): Oklch {
  if (inGamut(color)) return color;
  let lo = 0;
  let hi = color.c;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut({ ...color, c: mid })) lo = mid;
    else hi = mid;
  }
  return { ...color, c: lo };
}

/* ---------------------------------------------------------------- the ramp */

/** The ten steps, by name. */
export const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

/**
 * Target lightness per step. THIS IS THE TOOL'S OPINION, not a standard —
 * chosen so 500 sits where a brand colour usually lives, the top two steps are
 * usable as page washes, and 700+ stay dark enough to carry white text.
 */
const STEP_LIGHTNESS: Record<number, number> = {
  50: 0.97,
  100: 0.94,
  200: 0.88,
  300: 0.8,
  400: 0.71,
  500: 0.62,
  600: 0.54,
  700: 0.45,
  800: 0.36,
  900: 0.26,
};

export type Swatch = {
  step: number;
  hex: string;
  /** Contrast against black and white. MEASURED, per WCAG 2.1. */
  onWhite: number;
  onBlack: number;
  /** Which of black/white passes AA for body text (≥4.5), or null if neither. */
  bestBodyText: "black" | "white" | null;
  /** Passes AA for large text (≥3) — headings 24px+, or 19px+ bold. */
  largeTextOk: "black" | "white" | null;
};

export function buildRamp(base: Rgb): Swatch[] {
  const { c, h } = rgbToOklch(base);

  return RAMP_STEPS.map((step) => {
    const clamped = clampToGamut({ l: STEP_LIGHTNESS[step]!, c, h });
    const rgb = oklchToRgb(clamped);
    const hex = toHex(rgb);
    /* Measure the HEX, not the float — the hex is what actually ships, and
     * rounding to 8 bits can move a ratio across a threshold. Reporting a pass
     * on a colour nobody will render is the kind of number this repo does not
     * print. */
    const rounded = parseHex(hex)!;
    const onWhite = contrastRatio(rounded, { r: 1, g: 1, b: 1 });
    const onBlack = contrastRatio(rounded, { r: 0, g: 0, b: 0 });

    return {
      step,
      hex,
      onWhite,
      onBlack,
      bestBodyText: pick(onBlack, onWhite, 4.5),
      largeTextOk: pick(onBlack, onWhite, 3),
    };
  });
}

function pick(onBlack: number, onWhite: number, threshold: number) {
  const blackOk = onBlack >= threshold;
  const whiteOk = onWhite >= threshold;
  if (blackOk && whiteOk) return onBlack >= onWhite ? "black" : "white";
  if (blackOk) return "black";
  if (whiteOk) return "white";
  return null;
}

/* ------------------------------------------------------------------ contrast */

/** WCAG 2.1 relative luminance. */
export function luminance({ r, g, b }: Rgb): number {
  return (
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
  );
}

/** WCAG 2.1 contrast ratio, 1–21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

/** "4.53" — two decimals, which is how WCAG ratios are conventionally quoted. */
export function formatRatio(ratio: number): string {
  return ratio.toFixed(2);
}
