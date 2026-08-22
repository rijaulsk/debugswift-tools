/* A QR encoder, from scratch.
 *
 * WHY NOT A LIBRARY, since this is by far the most code in the repo. The rule
 * is "no new dependency without stating why", and the honest statement here is
 * that a QR encoder is a closed, finished specification (ISO/IEC 18004) with no
 * surface to maintain: it does not track a moving API, it has no security
 * updates, and its output is verifiable by machine. Once it is right it is
 * right forever. That is the rare case where owning the code is cheaper than
 * owning a dependency — the opposite call from, say, parsing HTML.
 *
 * IT IS ONLY WORTH OWNING IF IT IS VERIFIED. A QR that scans as the wrong URL
 * is worse than no tool at all, because it gets printed on a van and nobody
 * checks it again. So this is not trusted on inspection: the repo's check
 * generates codes across every supported version and error-correction level and
 * DECODES them back with an independent decoder, asserting the round trip. If
 * you change anything in this file, run it.
 *
 * SCOPE: versions 1–10, which hold up to 271 bytes at level L — comfortably
 * more than any URL, phone number or WhatsApp link this tool exists for.
 * Content that does not fit is REFUSED with a clear message rather than
 * silently truncated. The block tables below are the reason for the ceiling:
 * they are transcribed from the specification, not derived, so every extra
 * version is another row that has to be exactly right.
 */

export type EccLevel = "L" | "M" | "Q" | "H";

export class QrError extends Error {}

/* ------------------------------------------------------------ GF(256) maths */

/* Reed–Solomon works over GF(256) with the QR primitive polynomial 0x11D.
 * Log/antilog tables turn multiplication into addition, which is the only
 * reason this is fast enough to run on every keystroke. */
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]!;
})();

const mul = (a: number, b: number) =>
  a === 0 || b === 0 ? 0 : EXP[LOG[a]! + LOG[b]!]!;

/** Generator polynomial for `degree` error-correction codewords. */
function rsGenerator(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]!;
      next[j + 1] ^= mul(poly[j]!, EXP[i]!);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = rsGenerator(ecLen);
  const result = new Uint8Array(ecLen);
  for (const byte of data) {
    const factor = byte ^ result[0]!;
    result.copyWithin(0, 1);
    result[ecLen - 1] = 0;
    for (let i = 0; i < ecLen; i++) result[i] ^= mul(gen[i + 1]!, factor);
  }
  return result;
}

/* ------------------------------------------------------------- spec tables */

/** [ecCodewordsPerBlock, group1Blocks, group1Data, group2Blocks, group2Data]
 *  per version (1-indexed) and level. Transcribed from ISO/IEC 18004 Table 9. */
type BlockSpec = [number, number, number, number, number];

const BLOCKS: Record<EccLevel, BlockSpec[]> = {
  L: [
    [7, 1, 19, 0, 0],
    [10, 1, 34, 0, 0],
    [15, 1, 55, 0, 0],
    [20, 1, 80, 0, 0],
    [26, 1, 108, 0, 0],
    [18, 2, 68, 0, 0],
    [20, 2, 78, 0, 0],
    [24, 2, 97, 0, 0],
    [30, 2, 116, 0, 0],
    [18, 2, 68, 2, 69],
  ],
  M: [
    [10, 1, 16, 0, 0],
    [16, 1, 28, 0, 0],
    [26, 1, 44, 0, 0],
    [18, 2, 32, 0, 0],
    [24, 2, 43, 0, 0],
    [16, 4, 27, 0, 0],
    [18, 4, 31, 0, 0],
    [22, 2, 38, 2, 39],
    [22, 3, 36, 2, 37],
    [26, 4, 43, 1, 44],
  ],
  Q: [
    [13, 1, 13, 0, 0],
    [22, 1, 22, 0, 0],
    [18, 2, 17, 0, 0],
    [26, 2, 24, 0, 0],
    [18, 2, 15, 2, 16],
    [24, 4, 19, 0, 0],
    [18, 2, 14, 4, 15],
    [22, 4, 18, 2, 19],
    [20, 4, 16, 4, 17],
    [24, 6, 19, 2, 20],
  ],
  H: [
    [17, 1, 9, 0, 0],
    [28, 1, 16, 0, 0],
    [22, 2, 13, 0, 0],
    [16, 4, 9, 0, 0],
    [22, 2, 11, 2, 12],
    [28, 4, 15, 0, 0],
    [26, 4, 13, 1, 14],
    [26, 4, 14, 2, 15],
    [24, 4, 12, 4, 13],
    [28, 6, 15, 2, 16],
  ],
};

export const MAX_VERSION = 10;

/** Alignment-pattern centre coordinates per version. Version 1 has none. */
const ALIGNMENT: number[][] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

const ECC_BITS: Record<EccLevel, number> = { L: 0b01, M: 0b00, Q: 0b11, H: 0b10 };

const ALNUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

/* ------------------------------------------------------------------- modes */

type Mode = "numeric" | "alphanumeric" | "byte";

function chooseMode(text: string): Mode {
  if (/^[0-9]*$/.test(text)) return "numeric";
  if ([...text].every((ch) => ALNUM.includes(ch))) return "alphanumeric";
  return "byte";
}

const MODE_BITS: Record<Mode, number> = {
  numeric: 0b0001,
  alphanumeric: 0b0010,
  byte: 0b0100,
};

/** Character-count indicator length. Versions 1–9 and 10–26 differ, and this
 *  encoder spans that boundary at version 10 — a classic off-by-one source. */
function countBits(mode: Mode, version: number): number {
  const small = version <= 9;
  if (mode === "numeric") return small ? 10 : 12;
  if (mode === "alphanumeric") return small ? 9 : 11;
  return small ? 8 : 16;
}

/* ------------------------------------------------------------- bit builder */

class Bits {
  private bits: number[] = [];

  push(value: number, length: number) {
    for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  }
  get length() {
    return this.bits.length;
  }
  padToByte() {
    while (this.bits.length % 8 !== 0) this.bits.push(0);
  }
  toBytes(): Uint8Array {
    const out = new Uint8Array(this.bits.length / 8);
    for (let i = 0; i < this.bits.length; i++) {
      if (this.bits[i]) out[i >> 3]! |= 0x80 >> (i & 7);
    }
    return out;
  }
}

function encodeData(text: string, mode: Mode, version: number): Bits {
  const bits = new Bits();
  bits.push(MODE_BITS[mode], 4);

  if (mode === "byte") {
    const bytes = new TextEncoder().encode(text);
    bits.push(bytes.length, countBits(mode, version));
    for (const b of bytes) bits.push(b, 8);
    return bits;
  }

  bits.push(text.length, countBits(mode, version));

  if (mode === "numeric") {
    for (let i = 0; i < text.length; i += 3) {
      const chunk = text.slice(i, i + 3);
      bits.push(Number(chunk), chunk.length * 3 + 1);
    }
  } else {
    for (let i = 0; i < text.length; i += 2) {
      if (i + 1 < text.length) {
        bits.push(ALNUM.indexOf(text[i]!) * 45 + ALNUM.indexOf(text[i + 1]!), 11);
      } else {
        bits.push(ALNUM.indexOf(text[i]!), 6);
      }
    }
  }
  return bits;
}

function dataCapacityBits(version: number, level: EccLevel): number {
  const [, g1, d1, g2, d2] = BLOCKS[level][version - 1]!;
  return (g1 * d1 + g2 * d2) * 8;
}

function chooseVersion(text: string, mode: Mode, level: EccLevel): number {
  for (let v = 1; v <= MAX_VERSION; v++) {
    if (encodeData(text, mode, v).length <= dataCapacityBits(v, level)) return v;
  }
  throw new QrError(
    "That's too long to fit in a QR code this tool can make. Shorten the link — a redirect or a short domain is the usual fix.",
  );
}

/* ---------------------------------------------------------- codeword build */

function buildCodewords(text: string, level: EccLevel, version: number): Uint8Array {
  const mode = chooseMode(text);
  const [ecLen, g1, d1, g2, d2] = BLOCKS[level][version - 1]!;
  const capacity = dataCapacityBits(version, level);

  const bits = encodeData(text, mode, version);
  /* Terminator: up to four zero bits, but never past capacity. */
  bits.push(0, Math.min(4, capacity - bits.length));
  bits.padToByte();

  const data = Array.from(bits.toBytes());
  const totalDataBytes = capacity / 8;
  /* Pad alternately with 0xEC / 0x11 — specified constants, not arbitrary. */
  for (let i = 0; data.length < totalDataBytes; i++) {
    data.push(i % 2 === 0 ? 0xec : 0x11);
  }

  /* Split into blocks, compute EC per block, then INTERLEAVE. Interleaving is
   * what makes a burst of damage spread across blocks rather than destroying
   * one — get the order wrong and the code still looks fine and never scans. */
  const dataBlocks: number[][] = [];
  const ecBlocks: number[][] = [];
  let offset = 0;
  for (let i = 0; i < g1 + g2; i++) {
    const size = i < g1 ? d1 : d2;
    const block = data.slice(offset, offset + size);
    offset += size;
    dataBlocks.push(block);
    ecBlocks.push(Array.from(rsEncode(Uint8Array.from(block), ecLen)));
  }

  const result: number[] = [];
  const maxData = Math.max(d1, d2);
  for (let i = 0; i < maxData; i++) {
    for (const block of dataBlocks) if (i < block.length) result.push(block[i]!);
  }
  for (let i = 0; i < ecLen; i++) {
    for (const block of ecBlocks) result.push(block[i]!);
  }
  return Uint8Array.from(result);
}

/* ------------------------------------------------------------ module grid */

type Grid = { size: number; modules: boolean[][]; reserved: boolean[][] };

function newGrid(version: number): Grid {
  const size = version * 4 + 17;
  return {
    size,
    modules: Array.from({ length: size }, () => new Array<boolean>(size).fill(false)),
    reserved: Array.from({ length: size }, () => new Array<boolean>(size).fill(false)),
  };
}

function setModule(g: Grid, r: number, c: number, dark: boolean, reserve = true) {
  g.modules[r]![c] = dark;
  if (reserve) g.reserved[r]![c] = true;
}

function placeFinder(g: Grid, row: number, col: number) {
  /* 7×7 finder plus its one-module separator, drawn together so the separator
   * can't be forgotten — a missing separator is a code that scans on some
   * readers and not others, which is the worst kind of bug. */
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const rr = row + r;
      const cc = col + c;
      if (rr < 0 || rr >= g.size || cc < 0 || cc >= g.size) continue;
      const inRing =
        (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
        (c >= 0 && c <= 6 && (r === 0 || r === 6));
      const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      setModule(g, rr, cc, inRing || inCore);
    }
  }
}

function placeFunctionPatterns(g: Grid, version: number) {
  placeFinder(g, 0, 0);
  placeFinder(g, 0, g.size - 7);
  placeFinder(g, g.size - 7, 0);

  /* Timing patterns. */
  for (let i = 8; i < g.size - 8; i++) {
    setModule(g, 6, i, i % 2 === 0);
    setModule(g, i, 6, i % 2 === 0);
  }

  /* Alignment patterns, skipping the three that would collide with finders. */
  const centres = ALIGNMENT[version]!;
  for (const r of centres) {
    for (const c of centres) {
      const nearFinder =
        (r === 6 && c === 6) ||
        (r === 6 && c === g.size - 7) ||
        (r === g.size - 7 && c === 6);
      if (nearFinder) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const ring = Math.max(Math.abs(dr), Math.abs(dc));
          setModule(g, r + dr, c + dc, ring !== 1);
        }
      }
    }
  }

  /* The dark module — always set, always here. */
  setModule(g, g.size - 8, 8, true);

  /* Reserve format-information areas; the values are written after masking. */
  for (let i = 0; i < 9; i++) {
    if (!g.reserved[8]![i]) setModule(g, 8, i, false);
    if (!g.reserved[i]![8]) setModule(g, i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    setModule(g, 8, g.size - 1 - i, false);
    setModule(g, g.size - 1 - i, 8, false);
  }

  /* Version information, versions 7 and up. BCH(18,6) computed rather than
   * transcribed — one less table to get wrong. */
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const value = ((version << 12) | rem) >>> 0;
    for (let i = 0; i < 18; i++) {
      const bit = ((value >>> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = (i % 3) + g.size - 11;
      setModule(g, b, a, bit);
      setModule(g, a, b, bit);
    }
  }
}

function placeData(g: Grid, codewords: Uint8Array) {
  let index = 0;
  let bitIndex = 7;
  let upward = true;

  for (let right = g.size - 1; right >= 1; right -= 2) {
    /* Column 6 is the vertical timing pattern and is skipped entirely. */
    if (right === 6) right = 5;
    for (let vert = 0; vert < g.size; vert++) {
      for (let j = 0; j < 2; j++) {
        const col = right - j;
        const row = upward ? g.size - 1 - vert : vert;
        if (g.reserved[row]![col]) continue;
        let dark = false;
        if (index < codewords.length) {
          dark = ((codewords[index]! >>> bitIndex) & 1) === 1;
          if (--bitIndex < 0) {
            bitIndex = 7;
            index++;
          }
        }
        g.modules[row]![col] = dark;
      }
    }
    upward = !upward;
  }
}

const MASKS: ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function applyMask(g: Grid, mask: number): Grid {
  const out: Grid = {
    size: g.size,
    modules: g.modules.map((row) => [...row]),
    reserved: g.reserved,
  };
  for (let r = 0; r < g.size; r++) {
    for (let c = 0; c < g.size; c++) {
      if (g.reserved[r]![c]) continue;
      if (MASKS[mask]!(r, c)) out.modules[r]![c] = !out.modules[r]![c];
    }
  }
  return out;
}

/** The four penalty rules. Lowest total wins — this is what stops a code
 *  containing large blank areas or false finder patterns. */
function penalty(g: Grid): number {
  const n = g.size;
  const m = g.modules;
  let score = 0;

  /* Rule 1: runs of five or more same-colour modules. */
  for (let i = 0; i < n; i++) {
    for (const horizontal of [true, false]) {
      let run = 1;
      for (let j = 1; j < n; j++) {
        const prev = horizontal ? m[i]![j - 1] : m[j - 1]![i];
        const cur = horizontal ? m[i]![j] : m[j]![i];
        if (cur === prev) {
          run++;
          if (run === 5) score += 3;
          else if (run > 5) score += 1;
        } else run = 1;
      }
    }
  }

  /* Rule 2: 2×2 blocks of one colour. */
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = m[r]![c];
      if (v === m[r]![c + 1] && v === m[r + 1]![c] && v === m[r + 1]![c + 1]) score += 3;
    }
  }

  /* Rule 3: the 1:1:3:1:1 finder-like pattern with four light modules beside it. */
  const pattern = [true, false, true, true, true, false, true];
  const matches = (get: (k: number) => boolean | undefined, start: number) => {
    for (let k = 0; k < 7; k++) if (get(start + k) !== pattern[k]) return false;
    return true;
  };
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= n - 7; j++) {
      for (const horizontal of [true, false]) {
        const get = (k: number) =>
          k < 0 || k >= n ? undefined : horizontal ? m[i]![k] : m[k]![i];
        if (!matches(get, j)) continue;
        const before = [j - 4, j - 3, j - 2, j - 1].every(
          (k) => get(k) === false || get(k) === undefined,
        );
        const after = [j + 7, j + 8, j + 9, j + 10].every(
          (k) => get(k) === false || get(k) === undefined,
        );
        if (before || after) score += 40;
      }
    }
  }

  /* Rule 4: deviation from a 50/50 dark ratio. */
  let dark = 0;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r]![c]) dark++;
  const percent = (dark * 100) / (n * n);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return score;
}

function writeFormatInfo(g: Grid, level: EccLevel, mask: number) {
  const data = (ECC_BITS[level] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const value = (((data << 10) | rem) ^ 0x5412) >>> 0;

  const n = g.size;

  /* THE BIT ORDER IS MOST-SIGNIFICANT FIRST, and this is the bug that made the
   * first working version of this file produce codes that were correct in every
   * other respect and scanned as nothing.
   *
   * Everything else had already been verified against published reference
   * vectors — the data codewords, the Reed–Solomon parity, the module
   * placement, even the format VALUE itself. The 15-bit value was right; it was
   * being written backwards. A decoder read a valid-looking code, got a format
   * string that failed its BCH check, and gave up. Nothing about the picture
   * looks wrong.
   *
   * Both copies place the value's bit 14 at the first position below and bit 0
   * at the last. Verified empirically against an independent encoder at two
   * different (level, mask) combinations — see the repo's QR check.
   *
   * The positions are written out as explicit tables rather than computed from
   * loop arithmetic. The layout skips the timing row and column and stops short
   * of the dark module, and every off-by-one there is invisible in the output. */
  const copy1: [number, number][] = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
    /* (8,6) is the vertical timing pattern — skipped. */
    [8, 7], [8, 8], [7, 8],
    /* (6,8) is the horizontal timing pattern — skipped. */
    [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];

  const copy2: [number, number][] = [
    /* Up the bottom-left column: 7 modules, stopping ABOVE the dark module
     * at (n-8, 8), which is a fixed pattern and not format information. */
    [n - 1, 8], [n - 2, 8], [n - 3, 8], [n - 4, 8], [n - 5, 8], [n - 6, 8], [n - 7, 8],
    /* Then right along row 8 beside the top-right finder: 8 modules. */
    [8, n - 8], [8, n - 7], [8, n - 6], [8, n - 5],
    [8, n - 4], [8, n - 3], [8, n - 2], [8, n - 1],
  ];

  for (const positions of [copy1, copy2]) {
    positions.forEach(([r, c], k) => {
      setModule(g, r, c, ((value >>> (14 - k)) & 1) === 1);
    });
  }

  /* The dark module, restored last — the reservation pass cleared it. */
  setModule(g, n - 8, 8, true);
}

/* ------------------------------------------------------------------ public */

export type QrCode = {
  size: number;
  modules: boolean[][];
  version: number;
  level: EccLevel;
  mask: number;
};

export function encodeQr(
  text: string,
  level: EccLevel = "M",
  /** Force a mask instead of scoring all eight. Exists for the verification
   *  script, which compares this encoder against a reference implementation and
   *  needs both to use the same mask to diff meaningfully. Not used by the UI. */
  options: { mask?: number } = {},
): QrCode {
  if (!text) throw new QrError("Nothing to encode yet.");

  const mode = chooseMode(text);
  const version = chooseVersion(text, mode, level);
  const codewords = buildCodewords(text, level, version);

  const base = newGrid(version);
  placeFunctionPatterns(base, version);
  placeData(base, codewords);

  let bestScore = Infinity;
  let bestMask = options.mask ?? 0;

  if (options.mask === undefined) {
    for (let mask = 0; mask < 8; mask++) {
      const candidate = applyMask(base, mask);
      writeFormatInfo(candidate, level, mask);
      const score = penalty(candidate);
      if (score < bestScore) {
        bestScore = score;
        bestMask = mask;
      }
    }
  }

  const grid = applyMask(base, bestMask);
  writeFormatInfo(grid, level, bestMask);

  return { size: grid.size, modules: grid.modules, version, level, mask: bestMask };
}

/**
 * SVG output, which is the point of the tool.
 *
 * Vector, so it prints crisply at any size — most free QR tools hand back a
 * PNG at whatever pixels they felt like, which is fine on screen and visibly
 * soft on a printed sign. One <path> of rectangles rather than one <rect> per
 * module: a version 10 code is 3,249 modules and that many elements makes a
 * file no design tool enjoys opening.
 *
 * The quiet zone is 4 modules, per the specification. It is not decoration —
 * scanners need it, and cropping it is the single most common reason a printed
 * QR fails to read.
 */
/* Colours are the ONLY caller-supplied strings that reach the markup, so they
 * are escaped here at the sink rather than trusted from the form.
 *
 * This was a real injection, not a hypothetical: the colour picker validated
 * the value it DISPLAYED, while the free-text hex field beside it passed
 * whatever was typed straight through to `fill="${dark}"`, and the result is
 * rendered with dangerouslySetInnerHTML. Pasting
 * `#000" /><span>…</span><path d="` put live markup on the page.
 *
 * It was only ever self-XSS — colours are not read from the URL, so no link
 * could carry it. But this app hands values between tools through query params
 * as its core idea, and the day someone adds ?dark= for shareable brand codes
 * it becomes one-click. Guarding the sink means that day is safe by default. */
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
function safeColour(value: string, fallback: string): string {
  return HEX.test(value.trim()) ? value.trim() : fallback;
}

export function toSvg(
  code: QrCode,
  {
    scale = 8,
    quiet = 4,
    dark = "#000000",
    light = "#ffffff",
  }: { scale?: number; quiet?: number; dark?: string; light?: string } = {},
): string {
  const darkFill = safeColour(dark, "#000000");
  const lightFill = safeColour(light, "#ffffff");
  const dimension = (code.size + quiet * 2) * scale;
  let path = "";
  for (let r = 0; r < code.size; r++) {
    for (let c = 0; c < code.size; c++) {
      if (!code.modules[r]![c]) continue;
      const x = (c + quiet) * scale;
      const y = (r + quiet) * scale;
      path += `M${x} ${y}h${scale}v${scale}h-${scale}z`;
    }
  }
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dimension}" height="${dimension}" viewBox="0 0 ${dimension} ${dimension}" shape-rendering="crispEdges">`,
    `<rect width="${dimension}" height="${dimension}" fill="${lightFill}"/>`,
    `<path d="${path}" fill="${darkFill}"/>`,
    `</svg>`,
  ].join("");
}
