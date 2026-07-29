/* The document being built.
 *
 * One shape for both a quote and an invoice, because they differ by three
 * things — what the heading says, whether the date is "valid until" or "due",
 * and whether it asks to be paid — and not by structure. Two near-identical
 * types would drift.
 */

export type DocKind = "quote" | "invoice";

export type LineItem = {
  /** Stable key for React. Not part of the document. */
  id: string;
  description: string;
  /** Kept as the raw string the user typed. Parsing happens at compute time so
   *  a half-typed "1." doesn't get rewritten under the cursor. */
  quantity: string;
  unitPrice: string;
};

export type QuoteDoc = {
  kind: DocKind;
  /** Currency symbol, not a code — this prints on paper, and "₹" is what a
   *  reader expects to see rather than "INR". */
  currency: string;
  number: string;
  issuedOn: string;
  /** "Valid until" for a quote, "Due" for an invoice. */
  dueOn: string;

  fromName: string;
  fromDetails: string;
  toName: string;
  toDetails: string;

  items: LineItem[];

  /** Percentage, as typed. Empty means no tax line at all — which is the
   *  correct output for anyone not registered, rather than a 0% row. */
  taxRate: string;
  taxLabel: string;

  /** Advance percentage, as typed. Empty means the document says nothing about
   *  a deposit. The service-agreement standard is 50% on acceptance, which is
   *  why this is here rather than left to the notes field. */
  depositPercent: string;

  /** Spell the total out in words under the figure. On by default: it is the
   *  conventional guard against a figure being altered, and every Indian
   *  invoice template carries one. */
  showWords: boolean;

  notes: string;
};

export const BLANK_ITEM = (): LineItem => ({
  /* crypto.randomUUID is available in every browser this app supports and in
   * Node 19+, so it works during the server render too. */
  id: crypto.randomUUID(),
  description: "",
  quantity: "1",
  unitPrice: "",
});

export const BLANK_DOC = (): QuoteDoc => ({
  kind: "quote",
  currency: "₹",
  number: "",
  issuedOn: "",
  dueOn: "",
  fromName: "",
  fromDetails: "",
  toName: "",
  toDetails: "",
  items: [BLANK_ITEM()],
  taxRate: "",
  taxLabel: "GST",
  depositPercent: "",
  showWords: true,
  notes: "",
});
