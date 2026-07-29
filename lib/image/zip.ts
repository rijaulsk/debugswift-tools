/* A ZIP writer, in about a hundred lines.
 *
 * WHY NOT A LIBRARY. The usual reason to reach for one is DEFLATE, and this
 * archive doesn't need it: everything going in is an already-compressed image,
 * where DEFLATE saves a fraction of a percent and costs the time and the bundle
 * to do it. Without compression a ZIP is a well-documented envelope format —
 * a header per file, a directory at the end, and a CRC — and writing it is
 * arithmetic rather than an algorithm.
 *
 * So this uses STORED (method 0) entries. That is a real, ordinary ZIP: every
 * operating system's built-in extractor opens it.
 *
 * SPEC NOTES, since the magic numbers below are otherwise unreadable:
 *   0x04034b50  local file header signature
 *   0x02014b50  central directory header signature
 *   0x06054b50  end of central directory signature
 * Everything is little-endian. Sizes are 32-bit, which caps an archive at 4 GB
 * — irrelevant here, where the input is a handful of photos and the browser
 * would run out of memory long before.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Bytes): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** DOS time/date, which is what ZIP records. Two seconds of resolution, and
 *  the epoch is 1980 — both are the format's, not ours. */
function dosDateTime(d: Date): { time: number; date: number } {
  return {
    time: ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff,
    date:
      (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff,
  };
}

/* Uint8Array<ArrayBuffer>, not a bare Uint8Array: current TypeScript lib types
 * parameterise typed arrays by their backing buffer, and only ArrayBuffer-backed
 * ones are valid BlobParts. A SharedArrayBuffer-backed array cannot go into a
 * Blob, and the bare alias permits one. */
export type Bytes = Uint8Array<ArrayBuffer>;

export type ZipEntry = { name: string; data: Bytes };

export function makeZip(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const now = dosDateTime(new Date());

  const locals: Bytes[] = [];
  const centrals: Bytes[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(6, 0x0800, true); // flags: UTF-8 filenames
    lv.setUint16(8, 0, true); // method 0 = stored
    lv.setUint16(10, now.time, true);
    lv.setUint16(12, now.date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true); // compressed size
    lv.setUint32(22, size, true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // extra field length
    local.set(nameBytes, 30);

    locals.push(local, entry.data);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, now.time, true);
    cv.setUint16(14, now.date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true); // offset of local header
    central.set(nameBytes, 46);
    centrals.push(central);

    offset += local.length + size;
  }

  const centralSize = centrals.reduce((sum, c) => sum + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true); // entries on this disk
  ev.setUint16(10, entries.length, true); // total entries
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true); // offset of central directory

  return new Blob([...locals, ...centrals, end], { type: "application/zip" });
}

/** Make filenames unique inside the archive — two photos called image.jpg from
 *  different folders would otherwise collide and silently lose one. */
export function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    if (count === 0) return name;
    const dot = name.lastIndexOf(".");
    return dot === -1
      ? `${name} (${count})`
      : `${name.slice(0, dot)} (${count})${name.slice(dot)}`;
  });
}
