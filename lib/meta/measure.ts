/* Measuring a title the way Google actually cuts it.
 *
 * THE POINT OF THIS TOOL, in one paragraph: every free meta-tag tool on the
 * internet counts characters. Google does not truncate by characters — it
 * truncates by rendered PIXEL WIDTH. "Illinois plumbing inspections" and
 * "WWWWWWWWWWWWWWWWWWWWWWWWWWWWW" are the same character count and nowhere near
 * the same width, so a character counter tells you a 55-character title is fine
 * when it is already being cut, and tells you a 62-character one is too long
 * when it fits. Measuring the real thing is both more accurate and, oddly,
 * easier — the browser will do it for us.
 *
 * HOW IT MEASURES: a canvas 2D context and measureText(), in the font and size
 * Google uses in its desktop results. No layout, no DOM node, no reflow.
 *
 * WHAT WE ARE HONEST ABOUT, on screen and not just here:
 *   - The pixel budgets below are this tool's stated thresholds, read off
 *     Google's desktop layout. They are not a documented API and Google changes
 *     them. They are not a measurement of your site.
 *   - Google rewrites titles it doesn't like, whatever length they are. A title
 *     that fits is not a title that will be used.
 *   - Mobile results wrap to a second line rather than truncating at the same
 *     point, so "fits" here means "fits on desktop".
 *
 * Fonts: Google's desktop result titles render in Arial around 20px, snippets
 * in Arial around 14px. If the local machine has no Arial, canvas falls back and
 * the number drifts slightly — which is why the UI says "close, not exact".
 */

/** Google's desktop title line, in pixels. Stated threshold, not an API. */
export const TITLE_PIXEL_BUDGET = 600;
/** Google's desktop snippet, across two lines. */
export const DESCRIPTION_PIXEL_BUDGET = 920;

export const TITLE_FONT = "700 20px Arial, sans-serif";
export const DESCRIPTION_FONT = "400 14px Arial, sans-serif";

/* One canvas for the life of the page. Creating one per keystroke is a
 * surprising amount of garbage for a tool that measures on every input event. */
let ctx: CanvasRenderingContext2D | null | undefined;

function context(): CanvasRenderingContext2D | null {
  if (ctx !== undefined) return ctx;
  if (typeof document === "undefined") {
    ctx = null;
    return ctx;
  }
  ctx = document.createElement("canvas").getContext("2d");
  return ctx;
}

/**
 * Rendered width in pixels, or null when it cannot be measured.
 *
 * null is a real answer and callers must handle it rather than substituting a
 * character count: the two are not the same measurement, and quietly swapping
 * one for the other is how a tool starts reporting a number it did not take.
 * This happens on the server render, before the canvas exists.
 */
export function measureWidth(text: string, font: string): number | null {
  const c = context();
  if (!c) return null;
  c.font = font;
  return Math.round(c.measureText(text).width);
}

export type Fit = {
  /** Rendered width, or null before the canvas is available. */
  width: number | null;
  budget: number;
  /** How much of the text survives the cut. Equals the input when it fits. */
  visible: string;
  truncated: boolean;
};

/**
 * Where the cut falls.
 *
 * Walks back from the end until the string fits, which is a linear scan over a
 * string that is never more than a couple of hundred characters — a binary
 * search here would be faster in theory and identical in practice.
 *
 * Google cuts mid-word and appends an ellipsis; it does not politely break on a
 * word boundary. The preview does the same thing, because showing a tidier
 * truncation than the real one would make a title look fine when it isn't.
 */
export function fitToBudget(text: string, font: string, budget: number): Fit {
  const width = measureWidth(text, font);
  if (width === null) {
    return { width: null, budget, visible: text, truncated: false };
  }
  if (width <= budget) {
    return { width, budget, visible: text, truncated: false };
  }

  const c = context()!;
  c.font = font;
  /* The ellipsis takes room too, so the surviving text has to fit inside the
   * budget minus its width. */
  const ellipsisWidth = c.measureText("…").width;
  let cut = text.length;
  while (cut > 0 && c.measureText(text.slice(0, cut)).width > budget - ellipsisWidth) {
    cut -= 1;
  }

  return {
    width,
    budget,
    visible: text.slice(0, cut).trimEnd(),
    truncated: true,
  };
}

/** How full the line is, 0–1, for the meter. null while unmeasured. */
export function fillRatio(fit: Fit): number | null {
  if (fit.width === null) return null;
  return Math.min(fit.width / fit.budget, 1);
}
