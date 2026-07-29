"use client";

import { useEffect, useId, useState } from "react";
import { useHasMounted } from "@/lib/hooks";
import {
  amountInWords,
  computeTotals,
  formatMinor,
  isPrintable,
  lineTotalMinor,
} from "@/lib/quote/compute";
import {
  BLANK_DOC,
  BLANK_ITEM,
  type DocKind,
  type LineItem,
  type QuoteDoc,
} from "@/lib/quote/types";

/* The quote / invoice builder.
 *
 * WHERE THE DATA GOES, because people paste client names and prices in here:
 * nowhere. There is no API route and no request carrying any of it. A draft is
 * kept in this browser's localStorage so a refresh doesn't destroy twenty
 * minutes of typing, and the UI says so in plain words with a button to wipe
 * it. That is a different claim from "we don't store anything" and the copy
 * makes the distinction rather than glossing it.
 *
 * BE PRECISE IN THE COPY, and this is not pedantry — an earlier draft of the
 * FAQ said "there's no server request at all, which you can confirm in your
 * browser's network tab". That was false: app/layout.tsx mounts Vercel
 * Analytics, so the tab shows requests to va.vercel-scripts.com on every page.
 * Inviting someone to check and then failing their check is worse than saying
 * nothing. The claim is now scoped to "no request that carries what you typed",
 * with the analytics script named. If analytics is ever removed, the copy can
 * be widened again — not before.
 *
 * PRINTING is window.print() against a print stylesheet built from Tailwind's
 * `print:` variants — no PDF library, no server render, no dependency. The
 * browser's own "Save as PDF" is better than anything we'd ship, and it is
 * already installed.
 *
 * HYDRATION: the draft is read from localStorage in the useState initialiser,
 * which runs in the browser on the first client render — but the form is not
 * rendered until useHasMounted() is true, so the server's HTML and the
 * hydration pass agree. See lib/hooks.ts.
 */

const STORAGE_KEY = "debugswift.quote.v1";

function loadDraft(): QuoteDoc {
  if (typeof window === "undefined") return BLANK_DOC();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return BLANK_DOC();
    const parsed = JSON.parse(raw) as Partial<QuoteDoc>;
    /* Spread over a blank doc rather than trusting the stored shape: this data
     * survives deploys, so a draft saved before a field existed must not
     * produce undefined halfway through a render. */
    const doc = { ...BLANK_DOC(), ...parsed };
    if (!Array.isArray(doc.items) || doc.items.length === 0) {
      doc.items = [BLANK_ITEM()];
    }
    return doc;
  } catch {
    return BLANK_DOC();
  }
}

export default function QuoteBuilder() {
  const mounted = useHasMounted();
  const [doc, setDoc] = useState<QuoteDoc>(loadDraft);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
    } catch {
      /* Private mode, or storage full. Losing the draft is survivable; throwing
       * inside a keystroke handler is not. */
    }
  }, [doc]);

  const set = <K extends keyof QuoteDoc>(key: K, value: QuoteDoc[K]) =>
    setDoc((d) => ({ ...d, [key]: value }));

  const setItem = (id: string, patch: Partial<LineItem>) =>
    setDoc((d) => ({
      ...d,
      items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));

  const addItem = () =>
    setDoc((d) => ({ ...d, items: [...d.items, BLANK_ITEM()] }));

  const removeItem = (id: string) =>
    setDoc((d) => ({
      ...d,
      /* Never drop to zero rows — an empty table with no way back is a dead
       * end, and "clear the last row" is what the user meant anyway. */
      items:
        d.items.length === 1
          ? [BLANK_ITEM()]
          : d.items.filter((i) => i.id !== id),
    }));

  const clearAll = () => {
    setDoc(BLANK_DOC());
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Nothing to do — the in-memory reset above already happened. */
    }
  };

  if (!mounted) {
    /* Server render and hydration pass. Deliberately not a spinner: this is
     * a fraction of a second, and a spinner that flashes is worse than a
     * placeholder that doesn't move. */
    return (
      <div className="rounded-card border-[1.5px] border-mist p-6 text-slate">
        Loading the builder…
      </div>
    );
  }

  const totals = computeTotals(doc);
  const isQuote = doc.kind === "quote";
  const printable = isPrintable(doc);

  return (
    <div>
      {/* ------------------------------------------------------------- form */}
      <div className="print:hidden">
        <fieldset className="border-0 p-0">
          <legend className="text-eyebrow uppercase text-indigo-600">
            What are you sending?
          </legend>
          <div className="mt-4 flex flex-wrap gap-3">
            {(["quote", "invoice"] as DocKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                aria-pressed={doc.kind === kind}
                onClick={() => set("kind", kind)}
                className={`rounded-full border-[1.5px] px-5 py-2.5 font-medium transition duration-200 ease-out ${
                  doc.kind === kind
                    ? "border-ink bg-ink text-cream"
                    : "border-ink text-ink hover:bg-sand"
                }`}
              >
                {kind === "quote" ? "Quote" : "Invoice"}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Text
            label="Your business"
            value={doc.fromName}
            onChange={(v) => set("fromName", v)}
            placeholder="Ganguly Plumbing"
          />
          <Text
            label={isQuote ? "Quote number" : "Invoice number"}
            value={doc.number}
            onChange={(v) => set("number", v)}
            placeholder={isQuote ? "Q-001" : "INV-001"}
          />
          <Area
            label="Your address and contact"
            value={doc.fromDetails}
            onChange={(v) => set("fromDetails", v)}
            placeholder={"12 Sector V\nSalt Lake, Kolkata 700091\n+91 …"}
          />
          <Area
            label="Client"
            value={doc.toDetails}
            onChange={(v) => set("toDetails", v)}
            placeholder={"Their name\nTheir address"}
            head={
              <Text
                label="Client name"
                value={doc.toName}
                onChange={(v) => set("toName", v)}
                placeholder="Acme Ltd"
              />
            }
          />
          <Text
            label="Date"
            type="date"
            value={doc.issuedOn}
            onChange={(v) => set("issuedOn", v)}
          />
          <Text
            label={isQuote ? "Valid until" : "Payment due"}
            type="date"
            value={doc.dueOn}
            onChange={(v) => set("dueOn", v)}
          />
        </div>

        {/* ------------------------------------------------------ line items */}
        <div className="mt-12">
          <p className="text-eyebrow uppercase text-indigo-600">Line items</p>
          <ul className="mt-4 space-y-4">
            {doc.items.map((item, index) => (
              <li
                key={item.id}
                className="rounded-card border-[1.5px] border-mist p-4"
              >
                <div className="grid gap-3 sm:grid-cols-[1fr_5rem_8rem_auto] sm:items-end">
                  <Text
                    label={index === 0 ? "Description" : undefined}
                    srLabel={`Description, line ${index + 1}`}
                    value={item.description}
                    onChange={(v) => setItem(item.id, { description: v })}
                    placeholder="Replace kitchen mixer tap"
                  />
                  <Text
                    label={index === 0 ? "Qty" : undefined}
                    srLabel={`Quantity, line ${index + 1}`}
                    value={item.quantity}
                    onChange={(v) => setItem(item.id, { quantity: v })}
                    inputMode="decimal"
                  />
                  <Text
                    label={index === 0 ? "Unit price" : undefined}
                    srLabel={`Unit price, line ${index + 1}`}
                    value={item.unitPrice}
                    onChange={(v) => setItem(item.id, { unitPrice: v })}
                    inputMode="decimal"
                    placeholder="0.00"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="justify-self-start pb-3 text-small font-medium text-slate underline-offset-4 transition-colors duration-200 ease-out hover:text-clay-700 hover:underline sm:justify-self-auto"
                  >
                    Remove
                    <span className="sr-only"> line {index + 1}</span>
                  </button>
                </div>
                <p className="mt-3 text-small tabular-nums text-slate">
                  Line total {formatMinor(lineTotalMinor(item), doc.currency)}
                </p>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={addItem}
            className="mt-4 font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
          >
            + Add a line
          </button>
        </div>

        {/* ------------------------------------------------------------ tax */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <Text
            label="Currency symbol"
            value={doc.currency}
            onChange={(v) => set("currency", v)}
          />
          <Text
            label="Tax label"
            value={doc.taxLabel}
            onChange={(v) => set("taxLabel", v)}
            placeholder="GST"
          />
          <Text
            label="Tax rate %"
            value={doc.taxRate}
            onChange={(v) => set("taxRate", v)}
            inputMode="decimal"
            placeholder="leave blank for none"
          />
        </div>
        <p className="mt-4 max-w-2xl text-small text-slate">
          Leave the rate blank and no tax line appears at all — which is the
          right document if you aren&apos;t registered. Adding a rate does not
          make this a tax invoice; see the note below the preview.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Text
            label={isQuote ? "Advance on acceptance %" : "Deposit already paid %"}
            value={doc.depositPercent}
            onChange={(v) => set("depositPercent", v)}
            inputMode="decimal"
            placeholder="50"
          />
          <div className="self-end pb-3">
            <label className="flex items-center gap-3 text-small text-ink">
              <input
                type="checkbox"
                checked={doc.showWords}
                onChange={(e) => set("showWords", e.target.checked)}
                className="h-5 w-5 accent-indigo-500"
              />
              Write the total out in words
            </label>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-small text-slate">
          Leave the advance blank and the document doesn&apos;t mention one. The
          amount in words is composed from the same figure as the numeral, so
          the two can never disagree.
        </p>

        <div className="mt-10">
          <Area
            label="Notes or terms"
            value={doc.notes}
            onChange={(v) => set("notes", v)}
            placeholder={
              isQuote
                ? "Price held for 30 days. 50% on acceptance."
                : "Payable within 14 days. Bank details…"
            }
          />
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-5 border-t-[1.5px] border-mist pt-8">
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!printable}
            className="inline-flex items-center justify-center rounded-full bg-clay-500 px-6 py-3 font-medium text-ink transition duration-200 ease-out hover:bg-clay-400 active:scale-[0.98] active:bg-clay-600 disabled:opacity-50"
          >
            Print or save as PDF
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="font-medium text-slate underline-offset-4 transition-colors duration-200 ease-out hover:text-clay-700 hover:underline"
          >
            Clear everything
          </button>
          {!printable && (
            <p className="text-small text-slate">
              Add your business name and one line item first.
            </p>
          )}
        </div>

        <p className="mt-6 max-w-2xl text-small text-slate">
          Your draft is kept in this browser so a refresh doesn&apos;t lose it,
          and nothing you type here is sent to us — the builder makes no request
          that carries it. “Clear everything” wipes the saved draft.
        </p>
      </div>

      {/* ---------------------------------------------------------- preview */}
      <div className="mt-16 print:mt-0">
        <p className="text-eyebrow uppercase text-indigo-600 print:hidden">
          Preview
        </p>
        {/* The printed document. On paper the border and radius are noise, so
         * they come off; the page's own margins do the framing. */}
        <div className="mt-4 rounded-card border-[1.5px] border-ink bg-paper p-8 print:mt-0 print:rounded-none print:border-0 print:p-0">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-h3 font-bold text-ink">
                {doc.fromName || "Your business"}
              </p>
              <p className="mt-2 whitespace-pre-line text-small text-slate">
                {doc.fromDetails}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-h3 font-bold uppercase tracking-wide text-ink">
                {isQuote ? "Quote" : "Invoice"}
              </p>
              {doc.number && (
                <p className="mt-1 text-small text-slate">{doc.number}</p>
              )}
              {doc.issuedOn && (
                <p className="mt-2 text-small text-slate">
                  Date {formatDate(doc.issuedOn)}
                </p>
              )}
              {doc.dueOn && (
                <p className="text-small text-slate">
                  {isQuote ? "Valid until" : "Due"} {formatDate(doc.dueOn)}
                </p>
              )}
            </div>
          </div>

          {(doc.toName || doc.toDetails) && (
            <div className="mt-10">
              <p className="text-eyebrow uppercase text-slate">
                {isQuote ? "Prepared for" : "Billed to"}
              </p>
              {doc.toName && (
                <p className="mt-2 font-medium text-ink">{doc.toName}</p>
              )}
              <p className="whitespace-pre-line text-small text-slate">
                {doc.toDetails}
              </p>
            </div>
          )}

          <table className="mt-10 w-full border-collapse text-left">
            <thead>
              <tr className="border-b-[1.5px] border-ink">
                <th className="pb-2 font-medium text-ink">Description</th>
                <th className="pb-2 text-right font-medium text-ink">Qty</th>
                <th className="pb-2 text-right font-medium text-ink">Unit</th>
                <th className="pb-2 text-right font-medium text-ink">Amount</th>
              </tr>
            </thead>
            <tbody>
              {doc.items
                .filter((i) => i.description.trim() !== "")
                .map((item) => (
                  <tr key={item.id} className="border-b border-mist">
                    <td className="py-3 pr-4 align-top text-slate">
                      {item.description}
                    </td>
                    <td className="py-3 text-right align-top tabular-nums text-slate">
                      {item.quantity}
                    </td>
                    <td className="py-3 pl-4 text-right align-top tabular-nums text-slate">
                      {formatMinor(
                        Math.round(Number(item.unitPrice || 0) * 100),
                        doc.currency,
                      )}
                    </td>
                    <td className="py-3 pl-4 text-right align-top tabular-nums text-ink">
                      {formatMinor(lineTotalMinor(item), doc.currency)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          <div className="mt-6 flex justify-end">
            <dl className="w-full max-w-xs space-y-2 text-small">
              <Row
                term="Subtotal"
                value={formatMinor(totals.subtotalMinor, doc.currency)}
              />
              {totals.taxMinor !== null && (
                <Row
                  term={`${doc.taxLabel || "Tax"} ${totals.taxRatePercent}%`}
                  value={formatMinor(totals.taxMinor, doc.currency)}
                />
              )}
              <div className="flex justify-between border-t-[1.5px] border-ink pt-2 text-ink">
                <dt className="font-bold">Total</dt>
                <dd className="font-bold tabular-nums">
                  {formatMinor(totals.totalMinor, doc.currency)}
                </dd>
              </div>
              {totals.depositMinor !== null && (
                <>
                  <Row
                    term={`${isQuote ? "Advance on acceptance" : "Deposit paid"} (${totals.depositPercent}%)`}
                    value={formatMinor(totals.depositMinor, doc.currency)}
                  />
                  <div className="flex justify-between text-ink">
                    <dt className="font-medium">
                      {isQuote ? "Balance on completion" : "Balance due"}
                    </dt>
                    <dd className="font-medium tabular-nums">
                      {formatMinor(totals.balanceMinor!, doc.currency)}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          {doc.showWords && totals.totalMinor > 0 && (
            <p className="mt-4 text-right text-small text-slate">
              {amountInWords(totals.totalMinor, currencyWord(doc.currency).unit, currencyWord(doc.currency).sub)}
            </p>
          )}

          {doc.notes && (
            <div className="mt-10 border-t border-mist pt-4">
              <p className="whitespace-pre-line text-small text-slate">
                {doc.notes}
              </p>
            </div>
          )}
        </div>

        {/* The honesty note. It prints too — deliberately. Someone who saves
         * this as a PDF and files it should still be able to see what the
         * document is and isn't. */}
        <p className="mt-6 max-w-2xl text-small text-slate">
          This is a plain {isQuote ? "quote" : "invoice"}, not a GST tax invoice.
          If you&apos;re registered for GST, a compliant invoice also needs your
          GSTIN, the customer&apos;s GSTIN, HSN or SAC codes and the place of
          supply — none of which this produces. Check with your accountant before
          using it for anything you&apos;ll file.
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- bits */

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex justify-between text-slate">
      <dt>{term}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

/** The words for a currency symbol. Falls back to a neutral "Total in words"
 *  phrasing rather than guessing — writing "Rupees" over a dollar figure would
 *  be worse than saying nothing. */
function currencyWord(symbol: string): { unit: string; sub: string } {
  switch (symbol.trim()) {
    case "₹":
      return { unit: "Rupees", sub: "Paise" };
    case "$":
      return { unit: "Dollars", sub: "Cents" };
    case "£":
      return { unit: "Pounds", sub: "Pence" };
    case "€":
      return { unit: "Euros", sub: "Cents" };
    default:
      return { unit: "Total:", sub: "and" };
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

function Text({
  label,
  srLabel,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
}: {
  label?: string;
  /** Row-specific accessible name for the line-item table.
   *
   * Only the FIRST row shows a visible column header ("Description"); the rest
   * would otherwise be unlabelled inputs. Passing srLabel gives every row the
   * same shape of name — "Description, line 3" — whether or not it also shows
   * the header, so a screen-reader user hears the same thing in every row
   * instead of "Description" once and nothing after.
   *
   * It is applied as aria-label even when a visible label exists. That is safe
   * under WCAG 2.5.3 (Label in Name) because the accessible name CONTAINS the
   * visible text — "Description, line 1" starts with "Description" — so voice
   * control still works on what the user can read. */
  srLabel?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "decimal" | "text";
}) {
  const id = useId();
  return (
    <div>
      {label ? (
        <label htmlFor={id} className="text-small font-medium text-ink">
          {label}
        </label>
      ) : (
        <label htmlFor={id} className="sr-only">
          {srLabel}
        </label>
      )}
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        aria-label={srLabel}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-card border-[1.5px] border-ink bg-paper px-4 py-2.5 text-ink placeholder:text-stone ${
          label ? "mt-2" : ""
        }`}
      />
    </div>
  );
}

function Area({
  label,
  value,
  onChange,
  placeholder,
  head,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  head?: React.ReactNode;
}) {
  const id = useId();
  return (
    <div>
      {head}
      <label
        htmlFor={id}
        className={`text-small font-medium text-ink ${head ? "mt-4 block" : ""}`}
      >
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full resize-y rounded-card border-[1.5px] border-ink bg-paper px-4 py-2.5 text-ink placeholder:text-stone"
      />
    </div>
  );
}
