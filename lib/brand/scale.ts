/* A type scale.
 *
 * One base size and one ratio produce every step: each is the previous one
 * multiplied by the ratio. That is all a modular scale is, and it is worth
 * having a tool do it only because the alternative is picking sizes one at a
 * time until they look right, which is how you end up with 15px, 17px, 18px
 * and 19px all in one stylesheet doing the same job.
 *
 * Sizes are rounded to whole pixels. An unrounded scale gives 25.632px, which
 * is precision nobody can see and everybody has to read.
 */

export type ScaleStep = {
  name: string;
  px: number;
  /** rem at a 16px root, which is what the CSS output uses — a scale in px
   *  ignores anyone who has changed their browser's default text size. */
  rem: number;
  /** Suggested line height, tighter as the type gets bigger. Display type at
   *  1.5 looks like a leaflet; body at 1.1 is unreadable. */
  lineHeight: number;
};

export const RATIOS: { name: string; value: number; note: string }[] = [
  { name: "Minor second", value: 1.067, note: "Very close steps. Dense, text-heavy pages." },
  { name: "Major second", value: 1.125, note: "Restrained. A safe default for most sites." },
  { name: "Minor third", value: 1.2, note: "Clear hierarchy without shouting." },
  { name: "Major third", value: 1.25, note: "Confident. Good for marketing pages." },
  { name: "Perfect fourth", value: 1.333, note: "Big jumps. Needs room to breathe." },
];

/* Steps below and above the base. Named for what they are used for rather than
 * xs/sm/lg/xl, because "Small print" tells you where it goes and "xs" doesn't. */
const STEPS: { name: string; power: number; lineHeight: number }[] = [
  { name: "Small print", power: -1, lineHeight: 1.5 },
  { name: "Body", power: 0, lineHeight: 1.6 },
  { name: "Lead paragraph", power: 1, lineHeight: 1.5 },
  { name: "Heading 3", power: 2, lineHeight: 1.35 },
  { name: "Heading 2", power: 3, lineHeight: 1.25 },
  { name: "Heading 1", power: 4, lineHeight: 1.15 },
  { name: "Display", power: 5, lineHeight: 1.05 },
];

export function buildScale(basePx: number, ratio: number): ScaleStep[] {
  return STEPS.map(({ name, power, lineHeight }) => {
    const px = Math.round(basePx * Math.pow(ratio, power));
    return { name, px, rem: Math.round((px / 16) * 1000) / 1000, lineHeight };
  });
}

/** Clamp what someone typed into a base size that produces a usable scale. */
export function normaliseBase(input: string): number {
  const n = Number(input.trim());
  if (!Number.isFinite(n)) return 18;
  return Math.min(Math.max(Math.round(n), 12), 24);
}
