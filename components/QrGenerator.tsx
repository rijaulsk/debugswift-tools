"use client";

import { useId, useMemo, useState } from "react";
import { useParam } from "@/lib/params";
import { checkScannability } from "@/lib/qr/contrast";
import { encodeQr, QrError, toSvg, type EccLevel } from "@/lib/qr/encode";
import { actionFor, payloadFor, type Kind, type Values } from "@/lib/qr/payload";

/* The QR tool.
 *
 * Everything runs in the browser — the encoder is plain arithmetic and the SVG
 * is a string. No request carries anything typed here.
 *
 * SVG IS THE POINT. Most free QR sites hand back a PNG at whatever pixel size
 * they picked, which is fine on a screen and visibly soft the moment it goes on
 * a printed sign or a van. Vector prints crisp at any size. A PNG download is
 * offered too, because plenty of software still won't take an SVG.
 */

/* The kinds, each declaring its own fields.
 *
 * It was one text box and four kinds. WiFi and a contact card need several
 * inputs each, so a kind now carries a field list and the form renders it —
 * which is also what lets the hint sit per-field rather than per-kind, where a
 * cold arrival needs it.
 *
 * WiFi is first after Link on purpose. "A QR for the café wifi" is the single
 * most common reason a small business wants one, and it was the thing this tool
 * could not do. */
type Field = {
  id: string;
  label: string;
  placeholder?: string;
  hint?: string;
  optional?: boolean;
  /* A short list renders as a segmented control rather than a select — three
   * options are faster to read than a dropdown that hides two of them. */
  choices?: { value: string; label: string }[];
  multiline?: boolean;
};

const KINDS: { id: Kind; label: string; blurb: string; fields: Field[] }[] = [
  {
    id: "link",
    label: "Link",
    blurb: "Opens a web page.",
    fields: [
      {
        id: "value",
        label: "Web address",
        placeholder: "example.com",
        hint: "We'll add https:// if you leave it off — without a scheme, many scanners treat it as plain text and do nothing.",
      },
    ],
  },
  {
    id: "wifi",
    label: "Wi-Fi",
    blurb: "Joins a network without anyone typing the password.",
    fields: [
      { id: "ssid", label: "Network name", placeholder: "Cafe Guest", hint: "Exactly as it appears in the phone's Wi-Fi list, including capitals." },
      { id: "password", label: "Password", placeholder: "", optional: true, hint: "Leave blank for an open network. Symbols are fine — they're escaped for you." },
      {
        id: "security",
        label: "Security",
        choices: [
          { value: "WPA", label: "WPA/WPA2/WPA3" },
          { value: "WEP", label: "WEP" },
        ],
        hint: "WPA covers almost everything made this century.",
      },
      {
        id: "hidden",
        label: "Hidden network",
        choices: [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" },
        ],
      },
    ],
  },
  {
    id: "vcard",
    label: "Contact card",
    blurb: "Saves your details straight into their phone.",
    fields: [
      { id: "first", label: "First name", placeholder: "Rijaul" },
      { id: "last", label: "Last name", placeholder: "Sk", optional: true },
      { id: "org", label: "Business", placeholder: "DebugSwift", optional: true },
      { id: "title", label: "Role", placeholder: "Founder", optional: true },
      { id: "phone", label: "Phone", placeholder: "+91 85850 30894", optional: true },
      { id: "email", label: "Email", placeholder: "hello@example.com", optional: true },
      { id: "url", label: "Website", placeholder: "example.com", optional: true },
    ],
  },
  {
    id: "phone",
    label: "Phone",
    blurb: "Starts a call.",
    fields: [{ id: "value", label: "Number", placeholder: "+91 85850 30894", hint: "Include the country code." }],
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    blurb: "Opens a chat with you.",
    fields: [{ id: "value", label: "Number", placeholder: "918585030894", hint: "Country code, digits only — no plus, no spaces." }],
  },
  {
    id: "email",
    label: "Email",
    blurb: "Starts an email, subject and all.",
    fields: [
      { id: "to", label: "To", placeholder: "hello@example.com" },
      { id: "subject", label: "Subject", placeholder: "Quote request", optional: true },
      { id: "body", label: "Message", placeholder: "Hi — I'd like a quote for…", optional: true, multiline: true },
    ],
  },
  {
    id: "sms",
    label: "Text message",
    blurb: "Opens a text, ready to send.",
    fields: [
      { id: "number", label: "Number", placeholder: "+91 85850 30894" },
      { id: "message", label: "Message", placeholder: "BOOK", optional: true, multiline: true, hint: "Handy for a keyword people text to book or enquire." },
    ],
  },
  {
    id: "text",
    label: "Plain text",
    blurb: "Just shows words on the screen.",
    fields: [{ id: "value", label: "Text", placeholder: "Back in 10 minutes", multiline: true }],
  },
];

const LEVELS: { id: EccLevel; label: string; note: string }[] = [
  { id: "L", label: "Low", note: "Smallest code. Screens and clean surfaces." },
  { id: "M", label: "Medium", note: "The sensible default for print." },
  { id: "Q", label: "High", note: "Survives scuffing. Good outdoors." },
  { id: "H", label: "Highest", note: "Densest. For rough surfaces, or if you'll cover part of it." },
];

/* payloadFor and actionFor now live in lib/qr/payload.ts — they are formats
 * with escaping rules rather than string concatenation, and a WiFi password
 * containing a semicolon silently corrupts a code that still scans perfectly. */

export default function QrGenerator() {
  /* ?kind= and ?value= let the audit send someone here with the right tab
   * already open — its "no WhatsApp link on the page" finding links straight to
   * the WhatsApp tab rather than dropping them on a generic form. */
  const prefillKind = useParam("kind", 20);
  const prefillValue = useParam("value", 500);

  const [kind, setKind] = useState<Kind>("link");
  /* Values are kept per-kind rather than in one shared box, so switching tabs
   * to compare doesn't destroy what was typed in the last one. */
  const [values, setValues] = useState<Record<Kind, Values>>(() => ({
    link: {},
    wifi: { security: "WPA", hidden: "no" },
    vcard: {},
    phone: {},
    whatsapp: {},
    email: {},
    sms: {},
    text: {},
  }));
  const [level, setLevel] = useState<EccLevel>("M");
  const inputId = useId();

  /* Adjusted during render rather than in an effect — the react.dev "you might
   * not need an effect" case. Once the visitor touches anything, `touched`
   * stops the URL from reasserting itself. */
  const [touched, setTouched] = useState(false);
  if (!touched && (prefillKind || prefillValue)) {
    setTouched(true);
    const target = KINDS.find((k) => k.id === prefillKind)?.id;
    if (target) setKind(target);
    if (prefillValue) {
      /* The handoff sends one value, so it fills that kind's FIRST field —
       * which is the identifying one in every kind. */
      const k = target ?? "link";
      const first = KINDS.find((x) => x.id === k)!.fields[0]!.id;
      setValues((prev) => ({ ...prev, [k]: { ...prev[k], [first]: prefillValue } }));
    }
  }

  const [dark, setDark] = useState("#000000");
  const [light, setLight] = useState("#ffffff");

  const active = KINDS.find((k) => k.id === kind)!;
  const current = values[kind];
  const payload = payloadFor(kind, current);
  const action = actionFor(kind, current);

  const setField = (field: string, next: string) =>
    setValues((prev) => ({ ...prev, [kind]: { ...prev[kind], [field]: next } }));
  const scan = checkScannability(dark, light);

  const result = useMemo(() => {
    if (!payload) return null;
    try {
      const code = encodeQr(payload, level);
      return { code, svg: toSvg(code, { dark, light }), error: null as string | null };
    } catch (err) {
      return {
        code: null,
        svg: null,
        error: err instanceof QrError ? err.message : "Something went wrong encoding that.",
      };
    }
  }, [payload, level, dark, light]);

  const download = (format: "svg" | "png") => {
    if (!result?.svg || !result.code) return;
    if (format === "svg") {
      triggerDownload(
        new Blob([result.svg], { type: "image/svg+xml" }),
        "qr-code.svg",
      );
      return;
    }
    /* PNG via canvas at a print-usable size. 1024px across is enough for a
     * code a few inches wide at 300dpi. */
    const size = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    const blob = new Blob([result.svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      canvas.toBlob((out) => out && triggerDownload(out, "qr-code.png"), "image/png");
    };
    img.src = url;
  };

  return (
    <div className="space-y-10">
      <fieldset className="border-0 p-0">
        <legend className="text-eyebrow uppercase text-indigo-600">
          What should it open?
        </legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              aria-pressed={kind === k.id}
              onClick={() => setKind(k.id)}
              className={`rounded-full border-[1.5px] px-5 py-2.5 font-medium transition duration-200 ease-out ${
                kind === k.id
                  ? "border-ink bg-ink text-cream"
                  : "border-ink text-ink hover:bg-sand"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <p className="text-small text-slate">{active.blurb}</p>
        <div className="mt-5 space-y-5">
          {active.fields.map((field) => (
            <FieldInput
              key={`${kind}-${field.id}`}
              idBase={`${inputId}-${kind}-${field.id}`}
              field={field}
              value={current[field.id] ?? ""}
              onChange={(next) => setField(field.id, next)}
            />
          ))}
        </div>

        {/* What it DOES, in a sentence, above the raw payload. "WIFI:T:WPA;S:…"
          * is the proof; it is not the answer to "did I get this right?" — and
          * for a cold arrival it is the only line on the page that confirms the
          * code will do what they meant. */}
        {action && (
          <p className="mt-5 rounded-card border-[1.5px] border-mist bg-cream px-4 py-3 text-small text-ink">
            {action}
          </p>
        )}
        {payload && (
          <details className="mt-3">
            <summary className="cursor-pointer text-small text-slate">
              What gets encoded
            </summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-card border-[1.5px] border-mist bg-cream p-3 text-[13px] text-ink">
              {payload}
            </pre>
          </details>
        )}
      </div>

      <fieldset className="border-0 p-0">
        <legend className="text-eyebrow uppercase text-indigo-600">
          Error correction
        </legend>
        <p className="mt-3 max-w-2xl text-small text-slate">
          How much damage the code can take and still read. More correction means
          a denser code, not a bigger one — so on a small print, less is often
          more legible.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={level === l.id}
              onClick={() => setLevel(l.id)}
              title={l.note}
              className={`rounded-full border-[1.5px] px-4 py-2 text-small font-medium transition duration-200 ease-out ${
                level === l.id
                  ? "border-ink bg-ink text-cream"
                  : "border-ink text-ink hover:bg-sand"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-small text-slate">
          {LEVELS.find((l) => l.id === level)?.note}
        </p>
      </fieldset>

      {/* -------------------------------------------------------- colours */}
      <fieldset className="border-0 p-0">
        <legend className="text-eyebrow uppercase text-indigo-600">Colours</legend>
        <p className="mt-3 max-w-2xl text-small text-slate">
          A brand-coloured code is fine right up until it isn&apos;t. This checks
          whether a camera can still separate the two — measured, not assumed.
        </p>
        <div className="mt-4 flex flex-wrap gap-6">
          <ColourField label="Code" value={dark} onChange={setDark} />
          <ColourField label="Background" value={light} onChange={setLight} />
          <button
            type="button"
            onClick={() => {
              setDark("#000000");
              setLight("#ffffff");
            }}
            className="self-end pb-3 text-small font-medium text-slate underline-offset-4 transition-colors duration-200 ease-out hover:text-ink hover:underline"
          >
            Reset to black on white
          </button>
        </div>
        {scan && (
          <p
            className={`mt-4 max-w-2xl text-small ${
              scan.status === "bad"
                ? "text-clay-700"
                : scan.status === "risky"
                  ? "text-ink"
                  : "text-slate"
            }`}
          >
            <span className="font-medium tabular-nums">
              {scan.ratio.toFixed(1)}:1 contrast —{" "}
            </span>
            {scan.message}
          </p>
        )}
      </fieldset>

      <div className="border-t-[1.5px] border-mist pt-10">
        {!payload && (
          <p className="text-slate">Type something above and the code appears.</p>
        )}

        {result?.error && (
          <div className="rounded-card border-[1.5px] border-ink bg-paper p-6">
            <p className="text-eyebrow uppercase text-clay-700">
              Can&apos;t make that one
            </p>
            <p className="mt-3 text-ink">{result.error}</p>
          </div>
        )}

        {result?.svg && result.code && (
          <div className="flex flex-wrap items-start gap-10">
            {/* The rendered code. The ENCODED payload never reaches the markup
              * — it becomes modules, never characters — but that is only half
              * the input. The colour values are user text and are interpolated
              * into fill="…", which was a live markup-injection hole until
              * toSvg() started escaping them at the sink. Read safeColour() in
              * lib/qr/encode.ts before adding any other caller-supplied string
              * to this SVG. */}
            <div
              className="w-64 shrink-0 rounded-card border-[1.5px] border-ink bg-paper p-4"
              dangerouslySetInnerHTML={{ __html: result.svg }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-small text-slate">
                Version {result.code.version} · {result.code.size}×
                {result.code.size} modules · error correction{" "}
                {LEVELS.find((l) => l.id === result.code!.level)?.label.toLowerCase()}
              </p>
              <div className="mt-5 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => download("svg")}
                  className="inline-flex items-center justify-center rounded-full bg-clay-500 px-6 py-3 font-medium text-ink transition duration-200 ease-out hover:bg-clay-400 active:scale-[0.98] active:bg-clay-600"
                >
                  Download SVG
                </button>
                <button
                  type="button"
                  onClick={() => download("png")}
                  className="inline-flex items-center justify-center rounded-full border-[1.5px] border-ink px-6 py-3 font-medium text-ink transition duration-200 ease-out hover:bg-sand active:scale-[0.98] active:bg-mist"
                >
                  Download PNG
                </button>
              </div>
              <p className="mt-6 max-w-md text-small text-slate">
                Use the SVG wherever you can — it stays sharp at any size. The
                white border around the code is not decoration: scanners need it,
                and cropping it is the most common reason a printed QR won&apos;t
                read.
              </p>
              <p className="mt-3 max-w-md text-small text-slate">
                Scan it yourself before it goes to print. Always.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ColourField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-small font-medium text-ink">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-14 cursor-pointer rounded-card border-[1.5px] border-ink bg-paper p-1"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          aria-label={`${label} hex value`}
          className="w-28 rounded-card border-[1.5px] border-ink bg-paper px-3 py-2 text-small text-ink"
        />
      </div>
    </div>
  );
}

/** One field of whichever kind is active — a text box, a textarea, or a
 *  segmented control when the field has a short fixed set of answers. */
function FieldInput({
  idBase,
  field,
  value,
  onChange,
}: {
  idBase: string;
  field: Field;
  value: string;
  onChange: (next: string) => void;
}) {
  if (field.choices) {
    return (
      <fieldset className="border-0 p-0">
        <legend className="text-small font-medium text-ink">{field.label}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {field.choices.map((choice) => {
            const on = value === choice.value;
            return (
              <button
                key={choice.value}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(choice.value)}
                className={`rounded-full border-[1.5px] px-4 py-2 text-small font-medium transition duration-200 ease-out ${
                  on ? "border-ink bg-ink text-cream" : "border-ink text-ink hover:bg-sand"
                }`}
              >
                {choice.label}
              </button>
            );
          })}
        </div>
        {field.hint && <p className="mt-2 text-small text-slate">{field.hint}</p>}
      </fieldset>
    );
  }

  const shared =
    "mt-2 w-full rounded-card border-[1.5px] border-ink bg-paper px-5 py-3 text-ink placeholder:text-slate";

  return (
    <div>
      <label htmlFor={idBase} className="text-small font-medium text-ink">
        {field.label}
        {field.optional && <span className="ml-2 font-normal text-slate">optional</span>}
      </label>
      {field.multiline ? (
        <textarea
          id={idBase}
          rows={3}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${shared} resize-y`}
        />
      ) : (
        <input
          id={idBase}
          type="text"
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className={shared}
        />
      )}
      {field.hint && <p className="mt-2 text-small text-slate">{field.hint}</p>}
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
