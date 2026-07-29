"use client";

import { useId, useMemo, useState } from "react";
import { useParam } from "@/lib/params";
import { encodeQr, QrError, toSvg, type EccLevel } from "@/lib/qr/encode";

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

type Kind = "link" | "phone" | "whatsapp" | "text";

const KINDS: { id: Kind; label: string; hint: string; placeholder: string }[] = [
  {
    id: "link",
    label: "Link",
    hint: "A web address. Include https:// so every scanner opens it.",
    placeholder: "https://example.com",
  },
  {
    id: "phone",
    label: "Phone",
    hint: "Scanning starts a call. Include the country code.",
    placeholder: "+91 85850 30894",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    hint: "Opens a chat with you. Country code, digits only.",
    placeholder: "918585030894",
  },
  { id: "text", label: "Plain text", hint: "Anything else.", placeholder: "Back in 10 minutes" },
];

const LEVELS: { id: EccLevel; label: string; note: string }[] = [
  { id: "L", label: "Low", note: "Smallest code. Screens and clean surfaces." },
  { id: "M", label: "Medium", note: "The sensible default for print." },
  { id: "Q", label: "High", note: "Survives scuffing. Good outdoors." },
  { id: "H", label: "Highest", note: "Densest. For rough surfaces, or if you'll cover part of it." },
];

/** Turn the typed value into what actually gets encoded. */
function payloadFor(kind: Kind, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (kind === "phone") return `tel:${trimmed.replace(/[^\d+]/g, "")}`;
  if (kind === "whatsapp") return `https://wa.me/${trimmed.replace(/\D/g, "")}`;
  if (kind === "link" && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export default function QrGenerator() {
  /* ?kind= and ?value= let the audit send someone here with the right tab
   * already open — its "no WhatsApp link on the page" finding links straight to
   * the WhatsApp tab rather than dropping them on a generic form. */
  const prefillKind = useParam("kind", 20);
  const prefillValue = useParam("value", 500);

  const [kind, setKind] = useState<Kind>("link");
  const [value, setValue] = useState("");
  const [level, setLevel] = useState<EccLevel>("M");
  const inputId = useId();

  /* Adjusted during render rather than in an effect — the react.dev "you might
   * not need an effect" case. Once the visitor touches anything, `touched`
   * stops the URL from reasserting itself. */
  const [touched, setTouched] = useState(false);
  if (!touched && (prefillKind || prefillValue)) {
    setTouched(true);
    if (KINDS.some((k) => k.id === prefillKind)) setKind(prefillKind as Kind);
    if (prefillValue) setValue(prefillValue);
  }

  const active = KINDS.find((k) => k.id === kind)!;
  const payload = payloadFor(kind, value);

  const result = useMemo(() => {
    if (!payload) return null;
    try {
      const code = encodeQr(payload, level);
      return { code, svg: toSvg(code), error: null as string | null };
    } catch (err) {
      return {
        code: null,
        svg: null,
        error: err instanceof QrError ? err.message : "Something went wrong encoding that.",
      };
    }
  }, [payload, level]);

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
        <label htmlFor={inputId} className="font-medium text-ink">
          {active.label}
        </label>
        <p className="mt-1 text-small text-slate">{active.hint}</p>
        <input
          id={inputId}
          type="text"
          value={value}
          placeholder={active.placeholder}
          onChange={(e) => setValue(e.target.value)}
          className="mt-3 w-full rounded-card border-[1.5px] border-ink bg-paper px-5 py-3 text-ink placeholder:text-slate"
        />
        {payload && payload !== value.trim() && (
          <p className="mt-2 break-words text-small text-slate">
            Encodes as <span className="text-ink">{payload}</span>
          </p>
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
            {/* The rendered code. dangerouslySetInnerHTML is safe here in the
             * strict sense: the SVG is built by toSvg() from a boolean matrix,
             * so no user text reaches the markup — the payload becomes modules,
             * never characters. */}
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

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
