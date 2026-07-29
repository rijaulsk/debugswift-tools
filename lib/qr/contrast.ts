import { contrastRatio, luminance, parseHex } from "@/lib/brand/color";

/* Will this colour combination actually scan?
 *
 * This exists because "brand-coloured QR code" is a request every designer
 * makes and a surprising number of tools grant without comment, producing a
 * pale gold code on a cream card that photographs as a grey smudge. The failure
 * happens at the printer, in front of a customer, and nobody re-tests it.
 *
 * A QR reader thresholds the image into light and dark. It needs a decisive gap
 * between the two, and it needs the DATA to be the dark half — most decoders
 * assume dark-on-light and a good number simply fail on an inverted code.
 *
 * The thresholds below are this tool's stated opinions, not a specification.
 * They are deliberately stricter than WCAG text contrast: text is read by a
 * person who can squint and lean in, and a QR code is read by a phone camera at
 * an angle in bad light, through ink that has spread on paper.
 */

/** Below this, the tool refuses to pretend it will work. */
const MIN_RATIO = 3;
/** Below this it warns; at or above it is comfortable for print. */
const GOOD_RATIO = 7;

export type ScanVerdict = {
  ratio: number;
  status: "good" | "risky" | "bad";
  message: string;
  /** True when the "dark" colour is lighter than the "light" one. */
  inverted: boolean;
};

export function checkScannability(dark: string, light: string): ScanVerdict | null {
  const d = parseHex(dark);
  const l = parseHex(light);
  if (!d || !l) return null;

  const ratio = contrastRatio(d, l);
  const inverted = luminance(d) > luminance(l);

  if (inverted) {
    return {
      ratio,
      inverted,
      status: "bad",
      message:
        "The code is lighter than its background. Many scanners only read dark-on-light and will simply ignore this one — swap the two colours.",
    };
  }
  if (ratio < MIN_RATIO) {
    return {
      ratio,
      inverted,
      status: "bad",
      message:
        "There isn't enough contrast between these two for a camera to separate them reliably. This will fail in ordinary light, and it will fail on paper before it fails on screen.",
    };
  }
  if (ratio < GOOD_RATIO) {
    return {
      ratio,
      inverted,
      status: "risky",
      message:
        "Readable on a screen, marginal in print. Ink spread and poor lighting both eat contrast — fine for a website, risky on a card or a sign.",
    };
  }
  return {
    ratio,
    inverted,
    status: "good",
    message: "Plenty of contrast. This will scan on paper as well as on screen.",
  };
}
