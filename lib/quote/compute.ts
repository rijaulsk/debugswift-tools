import type { LineItem, QuoteDoc } from "@/lib/quote/types";

/* Money arithmetic.
 *
 * EVERYTHING HERE IS IN MINOR UNITS (paise, cents) HELD AS INTEGERS, and that
 * is the only interesting decision in the file. The obvious implementation —
 * `qty * price` in floats, summed — is wrong in a way that shows up on real
 * invoices rather than in contrived examples: 0.1 + 0.2 is 0.30000000000000004,
 * and three lines of ₹1,234.35 add up to a total that ends in .04999999 and
 * prints as a rounded figure that doesn't match its own lines.
 *
 * A tool that hands someone a document to send a client cannot be off by a
 * paise, so amounts are converted to integers as early as possible, all
 * addition happens there, and formatting back to a decimal string happens once,
 * at the edge.
 *
 * Rounding rule: each LINE is rounded to the minor unit, then lines are summed.
 * That matches what the printed document shows — a total that disagrees with
 * the visible lines by a paise is the thing being avoided, and summing
 * unrounded lines would produce exactly that.
 */

/** Parse a user-typed amount into integer minor units. Returns 0 for anything
 *  unparseable, which is the right answer for an empty or half-typed field. */
export function toMinor(input: string): number {
  const cleaned = input.trim().replace(/[,\s]/g, "");
  if (!cleaned) return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Parse a quantity. Fractional quantities are real (2.5 hours), so this is not
 *  an integer parse — but it is bounded, because a paste accident should not
 *  produce a document with a quantity of 1e21. */
export function toQuantity(input: string): number {
  const cleaned = input.trim().replace(/[,\s]/g, "");
  if (!cleaned) return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 1_000_000);
}

/** Minor units → "1,234.50". Grouping is en-IN, matching where this is used. */
export function formatMinor(minor: number, currency: string): string {
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const whole = Math.trunc(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  const grouped = new Intl.NumberFormat("en-IN").format(whole);
  return `${negative ? "-" : ""}${currency}${grouped}.${fraction}`;
}

export function lineTotalMinor(item: LineItem): number {
  return Math.round(toQuantity(item.quantity) * toMinor(item.unitPrice));
}

export type Totals = {
  subtotalMinor: number;
  /** null when no tax rate was entered — the document then has no tax row at
   *  all, rather than a 0% one. Someone not registered for GST should not be
   *  sending a document that implies they are. */
  taxMinor: number | null;
  taxRatePercent: number | null;
  totalMinor: number;
};

export function computeTotals(doc: QuoteDoc): Totals {
  const subtotalMinor = doc.items.reduce(
    (sum, item) => sum + lineTotalMinor(item),
    0,
  );

  const rateRaw = doc.taxRate.trim();
  const rate = rateRaw ? Number(rateRaw) : NaN;
  const hasTax = rateRaw !== "" && Number.isFinite(rate) && rate > 0;

  const taxMinor = hasTax ? Math.round((subtotalMinor * rate) / 100) : null;

  return {
    subtotalMinor,
    taxMinor,
    taxRatePercent: hasTax ? rate : null,
    totalMinor: subtotalMinor + (taxMinor ?? 0),
  };
}

/** True when there is enough here to be worth printing. Used to keep the
 *  print button from producing a blank page rather than to nag the user. */
export function isPrintable(doc: QuoteDoc): boolean {
  return (
    doc.fromName.trim() !== "" &&
    doc.items.some((i) => i.description.trim() !== "")
  );
}
