"use client";

import { useId, useRef, useState } from "react";
import { useHasMounted } from "@/lib/hooks";
import {
  compressImage,
  formatBytes,
  outputName,
  supportsWebp,
  type OutputFormat,
} from "@/lib/image/compress";
import { makeZip, uniqueNames } from "@/lib/image/zip";

/* The compressor.
 *
 * Nothing is uploaded. The files never leave the tab — they are decoded,
 * redrawn and re-encoded by the browser, which is worth stating plainly because
 * "free image compressor" is exactly the kind of site people are right to be
 * wary of pasting a customer's photos into.
 *
 * Every size and percentage on screen is measured on the real output Blob. When
 * an image comes out bigger than it went in — normal for an already-optimised
 * file — the row says so and the download hands back the original. Reporting a
 * saving that isn't there would be the easiest lie in this repo to tell and the
 * hardest for anyone to catch.
 */

type Row = {
  id: string;
  file: File;
  status: "working" | "done" | "failed";
  outBlob?: Blob;
  outSize?: number;
  width?: number;
  height?: number;
  worse?: boolean;
  error?: string;
};

const MAX_FILES = 20;

export default function ImageCompressor() {
  const mounted = useHasMounted();
  const [rows, setRows] = useState<Row[]>([]);
  const [maxEdge, setMaxEdge] = useState(1600);
  const [quality, setQuality] = useState(0.75);
  const [format, setFormat] = useState<OutputFormat>("image/webp");
  const [dragging, setDragging] = useState(false);
  const [zipping, setZipping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileId = useId();

  const webpOk = mounted ? supportsWebp() : true;
  const effectiveFormat: OutputFormat = webpOk ? format : "image/jpeg";

  async function handleFiles(list: FileList | null) {
    if (!list) return;
    const files = Array.from(list)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, MAX_FILES);
    if (!files.length) return;

    const fresh: Row[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: "working",
    }));
    setRows((prev) => [...prev, ...fresh]);

    /* Sequential, not Promise.all: twenty full-resolution decodes at once will
     * exhaust memory on a phone, and the tool is for people on phones. */
    for (const row of fresh) {
      try {
        const result = await compressImage(row.file, {
          maxEdge,
          quality,
          format: effectiveFormat,
        });
        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  status: "done",
                  outBlob: result.blob,
                  outSize: result.blob.size,
                  width: result.width,
                  height: result.height,
                  worse: result.worseThanOriginal,
                }
              : r,
          ),
        );
      } catch (err) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  status: "failed",
                  error:
                    err instanceof Error
                      ? err.message
                      : "The browser couldn't read that file.",
                }
              : r,
          ),
        );
      }
    }
  }

  const done = rows.filter((r) => r.status === "done");
  const totalIn = done.reduce((sum, r) => sum + r.file.size, 0);
  const totalOut = done.reduce(
    (sum, r) => sum + (r.worse ? r.file.size : (r.outSize ?? 0)),
    0,
  );

  /* One archive instead of twenty save-as dialogs. Same honesty rule as the
   * single download: a row that came out bigger contributes its ORIGINAL file,
   * under its original name, so the ZIP never contains a worse version of
   * something than the one that went in. */
  const downloadAll = async () => {
    const ready = rows.filter((r) => r.status === "done");
    if (!ready.length) return;
    setZipping(true);
    try {
      const names = uniqueNames(
        ready.map((r) =>
          r.worse ? r.file.name : outputName(r.file.name, effectiveFormat),
        ),
      );
      const entries = await Promise.all(
        ready.map(async (r, i) => ({
          name: names[i]!,
          data: new Uint8Array(
            await (r.worse ? r.file : r.outBlob!).arrayBuffer(),
          ),
        })),
      );
      triggerDownload(makeZip(entries), "compressed-images.zip");
    } finally {
      setZipping(false);
    }
  };

  const download = (row: Row) => {
    /* A row that got bigger hands back the ORIGINAL. Downloading a worse file
     * because the tool produced it would be the tool serving itself. */
    const blob = row.worse ? row.file : row.outBlob;
    if (!blob) return;
    const name = row.worse
      ? row.file.name
      : outputName(row.file.name, effectiveFormat);
    triggerDownload(blob, name);
  };

  return (
    <div className="space-y-10">
      {/* ---------------------------------------------------------- settings */}
      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <label htmlFor={`${fileId}-edge`} className="text-small font-medium text-ink">
            Longest edge: {maxEdge}px
          </label>
          <input
            id={`${fileId}-edge`}
            type="range"
            min={400}
            max={3000}
            step={100}
            value={maxEdge}
            onChange={(e) => setMaxEdge(Number(e.target.value))}
            className="mt-3 w-full accent-indigo-500"
          />
          <p className="mt-1 text-small text-slate">
            1600px covers almost any website use. Images are never enlarged.
          </p>
        </div>
        <div>
          <label htmlFor={`${fileId}-q`} className="text-small font-medium text-ink">
            Quality: {Math.round(quality * 100)}
          </label>
          <input
            id={`${fileId}-q`}
            type="range"
            min={30}
            max={95}
            step={5}
            value={Math.round(quality * 100)}
            onChange={(e) => setQuality(Number(e.target.value) / 100)}
            className="mt-3 w-full accent-indigo-500"
          />
          <p className="mt-1 text-small text-slate">
            75 is usually indistinguishable from the original on a screen.
          </p>
        </div>
        <fieldset className="border-0 p-0">
          <legend className="text-small font-medium text-ink">Format</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["image/webp", "WebP"],
                ["image/jpeg", "JPEG"],
              ] as [OutputFormat, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={effectiveFormat === id}
                disabled={id === "image/webp" && !webpOk}
                onClick={() => setFormat(id)}
                className={`rounded-full border-[1.5px] px-4 py-2 text-small font-medium transition duration-200 ease-out disabled:opacity-40 ${
                  effectiveFormat === id
                    ? "border-ink bg-ink text-cream"
                    : "border-ink text-ink hover:bg-sand"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-small text-slate">
            {webpOk
              ? "WebP is smaller at the same quality and every current browser reads it."
              : "This browser can't write WebP, so JPEG it is."}
          </p>
        </fieldset>
      </div>

      {/* ------------------------------------------------------------- drop */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-card border-[1.5px] border-dashed p-10 text-center transition-colors duration-200 ease-out ${
          dragging ? "border-ink bg-sand" : "border-ink bg-paper"
        }`}
      >
        <p className="font-medium text-ink">Drop images here</p>
        <p className="mt-2 text-small text-slate">
          Up to {MAX_FILES} at a time. They stay on your device.
        </p>
        {/* The input is the real control; the button just triggers it, so
         * keyboard and screen-reader users get the same affordance. */}
        <input
          ref={inputRef}
          id={fileId}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
          className="sr-only"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-5 inline-flex items-center justify-center rounded-full border-[1.5px] border-ink px-6 py-3 font-medium text-ink transition duration-200 ease-out hover:bg-sand active:scale-[0.98] active:bg-mist"
        >
          Choose images
        </button>
      </div>

      {/* ------------------------------------------------------------ results */}
      {rows.length > 0 && (
        <div>
          {done.length > 0 && (
            <div className="rounded-card border-[1.5px] border-ink bg-paper p-6">
              <p className="text-eyebrow uppercase text-indigo-600">Total</p>
              <p className="mt-3 text-h3 font-bold tabular-nums text-ink">
                {formatBytes(totalIn)} → {formatBytes(totalOut)}
              </p>
              <p className="mt-2 text-slate">
                {totalOut < totalIn
                  ? `${Math.round(((totalIn - totalOut) / totalIn) * 100)}% smaller across ${done.length} image${done.length === 1 ? "" : "s"}.`
                  : "No saving on these — they were already well optimised."}
              </p>
            </div>
          )}

          <ul className="mt-6 divide-y-[1.5px] divide-mist border-y-[1.5px] border-mist">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{row.file.name}</p>
                  {row.status === "working" && (
                    <p className="mt-1 text-small text-slate">Compressing…</p>
                  )}
                  {row.status === "failed" && (
                    <p className="mt-1 text-small text-clay-700">{row.error}</p>
                  )}
                  {row.status === "done" && (
                    <p className="mt-1 text-small tabular-nums text-slate">
                      {formatBytes(row.file.size)} →{" "}
                      {formatBytes(row.worse ? row.file.size : row.outSize!)}
                      {row.worse ? (
                        <span className="text-ink">
                          {" "}
                          — already smaller than we can make it, so you get the
                          original back
                        </span>
                      ) : (
                        <>
                          {" "}
                          ({Math.round(
                            ((row.file.size - row.outSize!) / row.file.size) * 100,
                          )}
                          % smaller) · {row.width}×{row.height}
                        </>
                      )}
                    </p>
                  )}
                </div>
                {row.status === "done" && (
                  <button
                    type="button"
                    onClick={() => download(row)}
                    className="shrink-0 font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
                  >
                    Download →
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-5">
            {done.length > 1 && (
              <button
                type="button"
                onClick={() => void downloadAll()}
                disabled={zipping}
                className="inline-flex items-center justify-center rounded-full border-[1.5px] border-ink px-6 py-3 font-medium text-ink transition duration-200 ease-out hover:bg-sand active:scale-[0.98] active:bg-mist disabled:opacity-50"
              >
                {zipping ? "Packing…" : `Download all ${done.length} as a ZIP`}
              </button>
            )}
            <button
              type="button"
              onClick={() => setRows([])}
              className="font-medium text-slate underline-offset-4 transition-colors duration-200 ease-out hover:text-clay-700 hover:underline"
            >
              Clear the list
            </button>
          </div>
        </div>
      )}

      <p className="max-w-2xl text-small text-slate" data-note="loss">
        Re-encoding is lossy, so keep your originals — this is for the copy that
        goes on the website, not your only copy. The browser also drops all
        metadata in the process: that removes GPS coordinates from phone photos,
        which is usually a good thing, but it also removes the colour profile and
        any copyright field.
      </p>
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
