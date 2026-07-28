/* Image compression, in the browser.
 *
 * No library and no wasm: the browser already ships a JPEG and WebP encoder,
 * reachable through canvas.toBlob(). Pulling in a codec bundle would add
 * megabytes to a page whose entire job is making files smaller, which would be
 * a funny thing to do.
 *
 * WHAT THE NUMBERS MEAN. Every byte figure this module reports is measured on
 * the actual output Blob. There is no estimate, no "typically saves 60%", and
 * no percentage computed from anything other than the two real file sizes. If a
 * file comes out bigger — which happens with already-optimised images — the
 * tool says so and offers the original.
 *
 * WHAT IS LOST, which the UI states rather than hiding:
 *   - Re-encoding is lossy. Compressing an already-compressed JPEG again always
 *     costs some quality, however high the setting.
 *   - Canvas drops all metadata: EXIF, GPS coordinates, camera settings,
 *     copyright fields, and the embedded colour profile. Stripping location out
 *     of a photo before it goes on a website is usually a win. Losing the
 *     colour profile means a wide-gamut photo can shift slightly, and losing a
 *     copyright field may matter to a photographer. Both are worth saying.
 */

export type OutputFormat = "image/webp" | "image/jpeg";

export type CompressOptions = {
  /** Longest edge in pixels. The image is never scaled UP. */
  maxEdge: number;
  /** 0–1, passed to the encoder. */
  quality: number;
  format: OutputFormat;
};

export type CompressResult = {
  blob: Blob;
  width: number;
  height: number;
  /** True when the output is LARGER than the input — an honest outcome for an
   *  already-optimised file, and the UI must offer the original instead. */
  worseThanOriginal: boolean;
};

/** Is WebP encodable here? Safari was late to this; do not assume. */
export function supportsWebp(): boolean {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Draw an image down to a target size.
 *
 * STEPWISE HALVING, not one big draw, and this is the only non-obvious thing in
 * the file. Canvas downscaling samples a small neighbourhood, so collapsing a
 * 4000px photo to 800px in a single drawImage skips most of the source pixels
 * and produces visible aliasing — thin lines and text turn to sparkle. Halving
 * repeatedly until within 2× of the target, then doing the last step, averages
 * the pixels properly and costs a few milliseconds.
 */
function drawScaled(
  source: ImageBitmap,
  targetWidth: number,
  targetHeight: number,
): HTMLCanvasElement {
  let currentWidth = source.width;
  let currentHeight = source.height;

  let canvas = document.createElement("canvas");
  canvas.width = currentWidth;
  canvas.height = currentHeight;
  let ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0);

  while (currentWidth > targetWidth * 2) {
    const nextWidth = Math.max(targetWidth, Math.floor(currentWidth / 2));
    const nextHeight = Math.max(targetHeight, Math.floor(currentHeight / 2));
    const next = document.createElement("canvas");
    next.width = nextWidth;
    next.height = nextHeight;
    const nextCtx = next.getContext("2d")!;
    nextCtx.imageSmoothingEnabled = true;
    nextCtx.imageSmoothingQuality = "high";
    nextCtx.drawImage(canvas, 0, 0, nextWidth, nextHeight);
    canvas = next;
    ctx = nextCtx;
    currentWidth = nextWidth;
    currentHeight = nextHeight;
  }

  if (currentWidth !== targetWidth || currentHeight !== targetHeight) {
    const final = document.createElement("canvas");
    final.width = targetWidth;
    final.height = targetHeight;
    const finalCtx = final.getContext("2d")!;
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = "high";
    finalCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
    return final;
  }
  return canvas;
}

export async function compressImage(
  file: File,
  { maxEdge, quality, format }: CompressOptions,
): Promise<CompressResult> {
  const bitmap = await createImageBitmap(file);

  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    /* Never upscale. Making a small image bigger adds bytes and invents
     * detail that was never there. */
    const scale = longest > maxEdge ? maxEdge / longest : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = drawScaled(bitmap, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, format, quality),
    );
    if (!blob) throw new Error("The browser couldn't encode that image.");

    return {
      blob,
      width,
      height,
      worseThanOriginal: blob.size >= file.size,
    };
  } finally {
    /* Bitmaps hold decoded pixels — a handful of large photos is hundreds of
     * megabytes if these are left to the collector. */
    bitmap.close();
  }
}

/** Swap the extension to match what was actually encoded. */
export function outputName(original: string, format: OutputFormat): string {
  const stem = original.replace(/\.[^.]+$/, "");
  return `${stem}.${format === "image/webp" ? "webp" : "jpg"}`;
}
