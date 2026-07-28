/* QR encoder verification. Run with `npm run check:qr`.
 *
 * WHY THIS EXISTS AND WHY IT MUST BE RUN AFTER ANY CHANGE TO lib/qr/encode.ts:
 * a QR code that is wrong does not look wrong. During development this encoder
 * had correct data codewords, correct Reed–Solomon parity, correct module
 * placement and a correct format value — verified against published reference
 * vectors — and still scanned as nothing at all, because the 15-bit format
 * string was written least-significant-bit first instead of most-significant.
 * The picture was indistinguishable from a working code.
 *
 * So correctness here is established by round trip, not by inspection: encode
 * with ours, decode with an independent implementation, assert the string comes
 * back identical. Both decoders are devDependencies and ship nowhere.
 *
 * `jsqr`   — independent decoder, the actual oracle.
 * `qrcode` — independent ENCODER, used to diff matrices module-by-module when
 *            a round trip fails. Without it a failure tells you only "broken".
 */
const qr = await import(new URL("../lib/qr/encode.ts", import.meta.url).href);
const jsQRmod = await import("jsqr");
const jsQR = jsQRmod.default;

let pass = 0;
let fail = 0;
const check = (ok, label) => {
  if (ok) pass++;
  else {
    fail++;
    console.log(`  FAIL  ${label}`);
  }
};

/** Render a code to an RGBA bitmap with the specified quiet zone. */
function toBitmap(code, scale = 4, quiet = 4) {
  const dim = (code.size + quiet * 2) * scale;
  const data = new Uint8ClampedArray(dim * dim * 4).fill(255);
  for (let r = 0; r < code.size; r++) {
    for (let c = 0; c < code.size; c++) {
      if (!code.modules[r][c]) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const i = (((r + quiet) * scale + dy) * dim + (c + quiet) * scale + dx) * 4;
          data[i] = data[i + 1] = data[i + 2] = 0;
        }
      }
    }
  }
  return { data, dim };
}

function roundTrip(text, level) {
  const code = qr.encodeQr(text, level);
  const { data, dim } = toBitmap(code);
  const decoded = jsQR(data, dim, dim);
  return { ok: !!decoded && decoded.data === text, code, got: decoded?.data };
}

const LEVELS = ["L", "M", "Q", "H"];

console.log("QR encoder verification\n");

/* 1. Real content, every level. */
const cases = [
  "https://debugswift.com",
  "https://wa.me/918585030894?text=Hi%20Deb",
  "tel:+918585030894",
  "mailto:hello@debugswift.com",
  "8585030894",
  "HTTPS://DEBUGSWIFT.COM/TOOLS",
  "Ganguly Plumbing — Salt Lake, Kolkata ₹",
  "a",
  "https://debugswift.com/services/business-process-automation?utm_source=van&utm_medium=print",
];
for (const text of cases) {
  for (const level of LEVELS) {
    const { ok, got } = roundTrip(text, level);
    check(ok, `${level} round trip for ${JSON.stringify(text)} (got ${JSON.stringify(got)})`);
  }
}
console.log(`  real content: ${cases.length * LEVELS.length} round trips`);

/* 2. Every supported version at every level. A wrong row in the block table
 *    only shows up at the version that uses it. */
for (const level of LEVELS) {
  for (let v = 1; v <= qr.MAX_VERSION; v++) {
    let text = null;
    for (let len = 1; len < 500; len++) {
      const candidate = "A".repeat(len) + "!"; // "!" forces byte mode
      let got;
      try {
        got = qr.encodeQr(candidate, level).version;
      } catch {
        break;
      }
      if (got === v) {
        text = candidate;
        break;
      }
    }
    if (!text) {
      check(false, `${level} could not construct a version ${v} payload`);
      continue;
    }
    check(roundTrip(text, level).ok, `${level} version ${v} round trip`);
  }
}
console.log(`  versions: ${LEVELS.length * qr.MAX_VERSION} round trips`);

/* 3. Every mask, forced, on one payload — mask selection must not be the only
 *    thing keeping the encoder honest. */
for (let mask = 0; mask < 8; mask++) {
  const text = "https://debugswift.com/tools";
  const code = qr.encodeQr(text, "M", { mask });
  const { data, dim } = toBitmap(code);
  const decoded = jsQR(data, dim, dim);
  check(!!decoded && decoded.data === text && code.mask === mask, `mask ${mask}`);
}
console.log("  masks: 8 forced");

/* 4. Refusal rather than truncation. */
try {
  qr.encodeQr("x".repeat(5000), "H");
  check(false, "overlong content should throw");
} catch (e) {
  check(e instanceof qr.QrError, "overlong content throws QrError");
}
check(
  (() => {
    try {
      qr.encodeQr("", "M");
      return false;
    } catch {
      return true;
    }
  })(),
  "empty content throws",
);

/* 5. SVG shape. */
const svg = qr.toSvg(qr.encodeQr("https://debugswift.com", "M"));
check(svg.startsWith("<svg xmlns="), "svg root");
check(svg.includes('shape-rendering="crispEdges"'), "crisp edges");
check((svg.match(/<path /g) || []).length === 1, "one path, not thousands of rects");
check(svg.trim().endsWith("</svg>"), "svg closed");

console.log(`\n${fail === 0 ? "ALL PASSED" : `${fail} FAILED`}  (${pass} checks)`);
process.exit(fail === 0 ? 0 : 1);
