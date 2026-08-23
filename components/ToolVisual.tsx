import {
  Braces,
  Check,
  ClipboardList,
  ImageDown,
  MailCheck,
  Minus,
  Palette as PaletteIcon,
  QrCode,
  ReceiptText,
  Ruler,
  Stethoscope,
} from "lucide-react";
import type { ArtifactKey } from "@/lib/tools";

/* Tool page artifacts — the counterpart to E:\debugswift's ServiceVisual.tsx,
 * and deliberately built in that file's idiom rather than a new one.
 *
 * The tools app shipped functional and visually inert: every page ran eyebrow →
 * title → lede → form → prose → FAQ → CTA in one column, with nothing to look
 * at and a dead five-column gutter at ≥lg. That reads as a service page, which
 * is exactly what it is not.
 *
 * The rule these follow is the marketing repo's, verbatim in spirit: NOT a
 * stock photo and NOT a generated illustration, because both read as
 * AI-template filler and that is the thing the brand is defined against. Each
 * tool instead gets a flat, ink-bordered artifact OF ITS OWN OUTPUT — the
 * report, the search result, the invoice, the palette. Pure HTML/CSS (plus one
 * genuine SVG for the QR modules), no images, no new dependencies,
 * server-rendered, free to load.
 *
 * THESE ARE ILLUSTRATIONS OF THE DELIVERABLE, NEVER OF A RESULT ANYONE GOT.
 * Every number below is either a product spec or obviously synthetic sample
 * data. Nothing here is a claim, and nothing here may become one.
 *
 * CLAY: none of these use a clay fill. They sit in the same viewport as the
 * page's one real clay CTA, and the ration is one clay element per view — the
 * same reason ServiceVisual's PageSkeleton uses an ink pill for its button.
 * Clay appears in exactly one artifact, `Palette`, where it is a SWATCH rather
 * than a CTA, mirroring ServiceVisual's Tokens.
 */

const frame =
  "w-full max-w-[380px] overflow-hidden rounded-card border-[1.5px] border-ink bg-paper";
const bar = "border-b-[1.5px] border-mist bg-cream px-5 py-3";

function Caption({ children }: { children: string }) {
  return <p className="text-eyebrow uppercase text-indigo-600">{children}</p>;
}

/* The report as a ledger — website-audit. Mirrors AuditReport's real status
 * vocabulary: a glyph plus a word, Indigo for pass and Ink for worth-a-look,
 * and no green or red anywhere. */
function AuditLedger() {
  const rows = [
    ["Secure connection", true],
    ["Title tag", true],
    ["Meta description", false],
    ["Link preview", true],
  ] as const;
  return (
    <div className={frame}>
      <div className={bar}>
        <Caption>34 checks, one page</Caption>
      </div>
      <ul className="divide-y-[1.5px] divide-mist">
        {rows.map(([label, passed]) => (
          <li key={label} className="flex items-center justify-between px-5 py-3.5">
            <span className="text-small text-ink">{label}</span>
            {passed ? (
              <Check
                size={18}
                strokeWidth={2}
                aria-hidden="true"
                className="text-indigo-600"
              />
            ) : (
              <span className="text-[13px] font-medium text-ink">worth a look</span>
            )}
          </li>
        ))}
      </ul>
      <p className="border-t-[1.5px] border-mist px-5 py-3.5 text-[13px] text-slate">
        Every answer shown, including the ones that pass.
      </p>
    </div>
  );
}

/* A search result with the tail cut — meta-generator. The faded tail is the
 * product's whole point, so the artifact shows it rather than describing it. */
function SerpResult() {
  return (
    <div className={frame}>
      <div className={bar}>
        <Caption>Measured in pixels</Caption>
      </div>
      <div className="px-5 py-6">
        <p className="text-[13px] text-slate">example.com › services</p>
        <p className="mt-1 text-h3 font-medium leading-tight text-indigo-700">
          Emergency plumbing repairs
        </p>
        <p className="mt-2 text-small text-slate">
          Same-day callouts across Salt Lake, with a fixed price agreed before
          anyone{" "}
          {/* The tail fades rather than truncating: low contrast IS the
            * information here, which is the one sanctioned Stone exception. */}
          <span className="text-stone">turns up at your door and starts…</span>
        </p>
        <div className="mt-5 flex items-center gap-3 border-t-[1.5px] border-mist pt-5">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-mist">
            <span className="block h-full w-[78%] rounded-full bg-indigo-500" />
          </span>
          <span className="text-[13px] tabular-nums text-slate">468/600px</span>
        </div>
      </div>
    </div>
  );
}

/* A quote that adds up — quote-generator. Figures are sample data chosen so the
 * lines visibly sum to the total, because the tool's actual selling point is
 * that they always do. */
function QuoteDoc() {
  const lines = [
    ["Site audit", "4,000.00"],
    ["Page rebuild", "18,500.00"],
    ["Handover", "2,500.00"],
  ] as const;
  return (
    <div className={frame}>
      <div className={bar}>
        <Caption>Quote #0001</Caption>
      </div>
      <ul className="divide-y-[1.5px] divide-mist">
        {lines.map(([label, amount]) => (
          <li key={label} className="flex items-center justify-between px-5 py-3">
            <span className="text-small text-ink">{label}</span>
            <span className="text-small tabular-nums text-slate">₹{amount}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t-[1.5px] border-ink px-5 py-3.5">
        <span className="text-small font-bold text-ink">Total</span>
        <span className="text-small font-bold tabular-nums text-ink">
          ₹25,000.00
        </span>
      </div>
      <p className="border-t-[1.5px] border-mist px-5 py-3.5 text-[13px] text-slate">
        Counted in paise, so the lines can never disagree with the total.
      </p>
    </div>
  );
}

/* The palette — brand-kit. Ported from ServiceVisual's Tokens, which is already
 * a 1:1 illustration of what this tool produces. The one artifact where clay is
 * a swatch and not a CTA. */
function Palette() {
  const swatches = [
    ["bg-ink", "Ink"],
    ["bg-indigo-500", "Indigo"],
    ["bg-clay-500", "Clay"],
    ["bg-sand", "Sand"],
    ["bg-cream", "Cream"],
  ] as const;
  return (
    <div className={frame}>
      <div className={bar}>
        <Caption>Ten steps, every one measured</Caption>
      </div>
      <div className="px-5 py-6">
        <div className="flex gap-2">
          {swatches.map(([cls, label]) => (
            <div key={label} className="flex-1">
              <div className={`h-12 rounded-[6px] border-[1.5px] border-ink ${cls}`} />
              <p className="mt-2 text-[13px] leading-4 text-slate">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-baseline justify-between border-t-[1.5px] border-mist pt-5">
          <p className="text-h3 font-bold text-ink">Heading</p>
          <p className="text-[13px] tabular-nums text-slate">6.19 : 1</p>
        </div>
        <p className="mt-1 text-small text-slate">
          Body text, one scale, every screen.
        </p>
      </div>
    </div>
  );
}

/* A QR code, drawn — qr-generator.
 *
 * The one artifact that is a real SVG rather than HTML boxes, because the thing
 * being illustrated IS a vector of modules. Finder squares sit top-left,
 * top-right and bottom-left, as they do in the specification — a detail worth
 * getting right on a page that sells a hand-written encoder.
 *
 * NOT A SCANNABLE CODE and not generated by lib/qr/encode.ts. It is a picture of
 * one, hand-authored as a fixed bitmap so it renders identically on server and
 * client. Do not wire it to the real encoder: an artifact that scans would send
 * whoever pointed a phone at it somewhere we never intended. */
const QR_ROWS = [
  "###.#.#.#.###",
  "#.#...#...#.#",
  "###..#.#..###",
  "....#...#....",
  "#.#.##...#.#.",
  ".##..#.#..##.",
  "#.#.##.##.#.#",
  ".#..#...#..#.",
  "##.#.##.#.##.",
  "....#.#.#....",
  "###..##.#...#",
  "#.#.#..##..#.",
  "###..#.#..#..",
] as const;

function QrBlock() {
  return (
    <div className={frame}>
      <div className={bar}>
        <Caption>The address, in the code itself</Caption>
      </div>
      <div className="flex flex-col items-center px-5 py-6">
        <svg
          viewBox="0 0 13 13"
          width="168"
          height="168"
          shapeRendering="crispEdges"
          role="img"
          aria-label="An illustration of a QR code"
          className="rounded-[6px] border-[1.5px] border-ink bg-paper p-1"
        >
          {QR_ROWS.map((row, y) =>
            row
              .split("")
              .map((cell, x) =>
                cell === "#" ? (
                  <rect
                    key={`${x}-${y}`}
                    x={x}
                    y={y}
                    width={1}
                    height={1}
                    fill="var(--color-ink)"
                  />
                ) : null,
              ),
          )}
        </svg>
        <p className="mt-4 text-center text-[13px] text-slate">
          No redirect that can expire, and no scan counter — nothing routes
          through us.
        </p>
      </div>
    </div>
  );
}

/* Before and after, by weight — image-compressor. The bars are proportional to
 * the figures shown, so the picture and the numbers agree. */
function WeightBars() {
  const rows = [
    ["Original", "3.4 MB", 100],
    ["WebP, q75", "312 KB", 9],
  ] as const;
  return (
    <div className={frame}>
      <div className={bar}>
        <Caption>Measured, not estimated</Caption>
      </div>
      <div className="space-y-5 px-5 py-6">
        {rows.map(([label, size, pct]) => (
          <div key={label}>
            <div className="flex items-baseline justify-between">
              <span className="text-small text-ink">{label}</span>
              <span className="text-small tabular-nums text-slate">{size}</span>
            </div>
            <span className="mt-2 block h-2.5 w-full overflow-hidden rounded-full bg-mist">
              <span
                className="block h-full rounded-full bg-indigo-500"
                style={{ width: `${pct}%` }}
              />
            </span>
          </div>
        ))}
        <p className="border-t-[1.5px] border-mist pt-4 text-[13px] text-slate">
          And when it comes out bigger, you get the original back.
        </p>
      </div>
    </div>
  );
}

/* The written brief — project-scoper. Deliberately shows a week range and no
 * money at all: the tool scopes rather than prices, and the artifact has to
 * hold that line too. */
function BriefSheet() {
  const items = [
    ["Six pages, one of them a form", true],
    ["Online payments", true],
    ["Customer logins", false],
  ] as const;
  return (
    <div className={frame}>
      <div className={bar}>
        <Caption>The brief</Caption>
      </div>
      <div className="px-5 py-6">
        <p className="text-h3 font-bold text-ink">A shop that takes bookings</p>
        <ul className="mt-5 space-y-3 border-t-[1.5px] border-mist pt-5">
          {items.map(([label, included]) => (
            <li key={label} className="flex items-center gap-2.5">
              {included ? (
                <Check
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="shrink-0 text-indigo-600"
                />
              ) : (
                <Minus
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="shrink-0 text-stone"
                />
              )}
              <span
                className={`text-small ${included ? "text-ink" : "text-slate"}`}
              >
                {label}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-5 border-t-[1.5px] border-mist pt-5 text-small text-slate">
          <strong className="font-bold text-ink">5–9 weeks</strong> of build, on
          our own budgeting. No prices — those come after a conversation.
        </p>
      </div>
    </div>
  );
}

/* What a search engine reads — schema-generator. A record card rather than a
 * code block: the point of the tool is that you never have to look at JSON. */
function SchemaCard() {
  const fields = [
    ["Name", "Ganguly Plumbing"],
    ["Address", "Salt Lake, Kolkata"],
    ["Phone", "+91 85850 30894"],
    ["Open", "Mon–Sat, 09:00–17:00"],
  ] as const;
  return (
    <div className={frame}>
      <div className={bar}>
        <Caption>What a search engine reads</Caption>
      </div>
      <ul className="divide-y-[1.5px] divide-mist">
        {fields.map(([label, value]) => (
          <li key={label} className="flex items-baseline gap-4 px-5 py-3">
            <span className="w-16 shrink-0 text-[13px] uppercase tracking-wide text-slate">
              {label}
            </span>
            <span className="text-small text-ink">{value}</span>
          </li>
        ))}
      </ul>
      <p className="border-t-[1.5px] border-mist px-5 py-3.5 text-[13px] text-slate">
        No star rating — a self-typed one is what earns a manual action.
      </p>
    </div>
  );
}

/* The four records, as a mail server reads them — email deliverability. One is
 * missing on purpose: a figure where everything passes illustrates a tool
 * nobody would need to run. */
function MailRecords() {
  const rows = [
    ["SPF", "v=spf1 …", true],
    ["DKIM", "selector1._domainkey", true],
    ["DMARC", "not published", false],
    ["MX", "2 servers", true],
  ] as const;
  return (
    <div className={frame}>
      <div className={bar}>
        <Caption>What a mail server checks</Caption>
      </div>
      <ul className="divide-y-[1.5px] divide-mist">
        {rows.map(([name, value, present]) => (
          <li key={name} className="flex items-center justify-between gap-4 px-5 py-3.5">
            <span className="w-14 shrink-0 text-small font-medium text-ink">{name}</span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-slate">{value}</span>
            {present ? (
              <Check
                size={18}
                strokeWidth={2}
                aria-hidden="true"
                className="shrink-0 text-indigo-600"
              />
            ) : (
              <span className="shrink-0 text-[13px] font-medium text-ink">missing</span>
            )}
          </li>
        ))}
      </ul>
      <p className="border-t-[1.5px] border-mist px-5 py-3.5 text-[13px] text-slate">
        No bounce, no error — mail just stops arriving.
      </p>
    </div>
  );
}

/* The hub card's glyph, keyed off the same registry field as the artifact so a
 * tool cannot end up with one and not the other.
 *
 * lucide only, 20–24px, 1.5px stroke, Indigo 600 — design system §4. These earn
 * their place by DISTINGUISHING eight otherwise-identical cards, which is the
 * opposite of the "one icon per heading just to fill space" the rule forbids.
 * Each one names the tool's instrument: a ruler for the tool that measures
 * pixels, a stethoscope for the one that diagnoses. */
const ICONS: Record<ArtifactKey, typeof Check> = {
  audit: Stethoscope,
  serp: Ruler,
  quote: ReceiptText,
  palette: PaletteIcon,
  qr: QrCode,
  weight: ImageDown,
  brief: ClipboardList,
  schema: Braces,
  email: MailCheck,
};

export function ToolIcon({
  artifact,
  className = "",
}: {
  artifact: ArtifactKey;
  className?: string;
}) {
  const Glyph = ICONS[artifact];
  return (
    <Glyph size={22} strokeWidth={1.5} aria-hidden="true" className={className} />
  );
}

/* The switch is exhaustive against lib/tools.ts's ArtifactKey, so adding a key
 * there without adding its case here is a compile error rather than a blank
 * column on a live page. */
export default function ToolVisual({ artifact }: { artifact: ArtifactKey }) {
  switch (artifact) {
    case "audit":
      return <AuditLedger />;
    case "serp":
      return <SerpResult />;
    case "quote":
      return <QuoteDoc />;
    case "palette":
      return <Palette />;
    case "qr":
      return <QrBlock />;
    case "weight":
      return <WeightBars />;
    case "brief":
      return <BriefSheet />;
    case "schema":
      return <SchemaCard />;
    case "email":
      return <MailRecords />;
  }
}
