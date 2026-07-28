import { fetchPage, FetchPageError, probe } from "@/lib/audit/fetchPage";
import {
  countBlockingScripts,
  getAnchorHrefs,
  getHtmlLang,
  getImages,
  getJsonLd,
  getLinkRels,
  getMetas,
  getTitle,
  headSection,
  metaContent,
  stripInert,
} from "@/lib/audit/html";
import type { AuditResult, Check } from "@/lib/audit/types";

/* THE CHECKS.
 *
 * Every entry answers one question about the page that was actually fetched,
 * and every `found` string is either a value lifted off that page or a number
 * this file measured. There are no benchmarks here, no "sites like yours", no
 * industry averages, and no comparison to a cohort we have not surveyed. The
 * honesty rule is not decoration on this file — a tool that invents a number is
 * worse than no tool, because the visitor cannot tell.
 *
 * The thresholds below (60 characters for a title, 2.5 seconds for a response)
 * are the tool's own stated opinions and are documented as such in the copy the
 * page renders. They are not measurements of anyone else's site.
 *
 * Adding a check: append it, give it a stable id, and put it in a group. The
 * score is counted from this array, so a new check changes the denominator
 * automatically and nothing else needs editing. */

const OK = "pass" as const;

/**
 * How many checks run. The page prose ("Eighteen checks, in five groups") and
 * the copy doc both quote this number, so it cannot live only in their heads.
 *
 * BUMP THIS WHEN YOU ADD A CHECK. auditPage logs loudly if it drifts — it does
 * not throw, because a miscounted heading is a copy bug and should not take the
 * tool offline for a visitor.
 *
 * Note this is the number of checks RUN, which is not always the score's
 * denominator: a check that doesn't apply to the page (no images, so nothing to
 * say about alt text) reports "info" and is left out of the count. The report
 * says so on screen rather than quietly showing a smaller total.
 */
export const TOTAL_CHECKS = 18;

export async function auditPage(input: string): Promise<AuditResult> {
  const page = await fetchPage(input);

  if (page.status >= 400) {
    /* Scoring a 404 would produce a page full of confident findings about an
     * error page. Refuse instead — the fail-loud rule. */
    throw new FetchPageError(
      `That page answered with HTTP ${page.status}, so there's nothing to check.`,
      page.status === 404
        ? "Check the address — that page doesn't exist on the site."
        : "The server returned an error. Worth trying again in a moment.",
    );
  }

  const final = new URL(page.finalUrl);
  const raw = page.html;
  const clean = stripInert(raw);
  const head = headSection(clean);
  const metas = getMetas(head);
  const links = getLinkRels(head);

  /* robots.txt is fetched from the FINAL url's origin, not the requested one:
   * after a redirect from example.com to www.example.com, the file that governs
   * the page we measured is the one on www. */
  const robots = await probe(new URL("/robots.txt", final.origin));
  const sitemapFromRobots = robots.ok
    ? robots.text
        .split(/\r?\n/)
        .map((line) => line.match(/^\s*sitemap\s*:\s*(\S+)/i)?.[1])
        .filter(Boolean)
    : [];
  const sitemapProbe =
    sitemapFromRobots.length === 0
      ? await probe(new URL("/sitemap.xml", final.origin))
      : null;

  const checks: Check[] = [
    ...findability({ final, metas, links, headers: page.headers, robots, sitemapFromRobots, sitemapProbe }),
    ...onThePage({ clean, head, metas }),
    ...howItShares({ metas }),
    ...gettingInTouch({ clean, metas }),
    ...delivery({ page, raw, head }),
  ];

  if (checks.length !== TOTAL_CHECKS) {
    console.error(
      `[audit] TOTAL_CHECKS says ${TOTAL_CHECKS} but ${checks.length} checks ran — update lib/audit/checks.ts, app/website-audit/page.tsx and docs/copy/tools.md.`,
    );
  }

  const gradeable = checks.filter((c) => c.status !== "info");

  return {
    requestedUrl: input.trim(),
    finalUrl: page.finalUrl,
    redirects: page.redirects,
    httpStatus: page.status,
    fetchedAt: new Date().toISOString(),
    ttfbMs: page.ttfbMs,
    htmlBytes: Buffer.byteLength(raw, "utf8"),
    checks,
    score: {
      passed: gradeable.filter((c) => c.status === OK).length,
      total: gradeable.length,
    },
  };
}

/* ---------------------------------------------------------------- findability */

function findability({
  final,
  metas,
  links,
  headers,
  robots,
  sitemapFromRobots,
  sitemapProbe,
}: {
  final: URL;
  metas: ReturnType<typeof getMetas>;
  links: { rel: string; href: string }[];
  headers: Headers;
  robots: { ok: boolean; status: number; text: string };
  sitemapFromRobots: (string | undefined)[];
  sitemapProbe: { ok: boolean } | null;
}): Check[] {
  const https = final.protocol === "https:";

  const robotsMeta = metaContent(metas, "robots") ?? "";
  const xRobots = headers.get("x-robots-tag") ?? "";
  const noindex = /noindex/i.test(robotsMeta) || /noindex/i.test(xRobots);

  const canonical = links.find((l) => l.rel.split(/\s+/).includes("canonical"));

  return [
    {
      id: "https",
      group: "Findability",
      label: "Secure connection",
      status: https ? OK : "fail",
      found: https
        ? "The page is served over HTTPS."
        : "The page is served over plain HTTP.",
      why: "Browsers mark plain HTTP pages as “Not secure”, which visitors see before they read a word.",
      ...(https ? {} : { fix: "Install a certificate and redirect every http:// address to https://." }),
    },
    {
      id: "indexable",
      group: "Findability",
      label: "Open to search engines",
      status: noindex ? "fail" : OK,
      found: noindex
        ? `The page asks search engines not to index it (${robotsMeta || xRobots}).`
        : "Nothing on the page tells search engines to skip it.",
      why: "A noindex instruction keeps the page out of search results entirely, however good it is.",
      ...(noindex
        ? {
            fix: "Remove the noindex from the robots meta tag or the X-Robots-Tag header. If it was left over from a staging site, this is usually the single most valuable fix on the list.",
          }
        : {}),
    },
    {
      id: "canonical",
      group: "Findability",
      label: "Canonical address",
      status: canonical ? OK : "warn",
      found: canonical
        ? `Declared as ${canonical.href}`
        : "No canonical link tag on the page.",
      why: "It tells search engines which address is the real one when the same page is reachable more than one way.",
      ...(canonical
        ? {}
        : { fix: "Add <link rel=\"canonical\" href=\"…\"> pointing at this page's preferred address." }),
    },
    {
      id: "robots-txt",
      group: "Findability",
      label: "robots.txt",
      status: robots.ok ? OK : "warn",
      found: robots.ok
        ? "Found at /robots.txt."
        : "No robots.txt was served at the site root.",
      why: "It's where crawlers look first, and where the sitemap is normally advertised.",
      ...(robots.ok
        ? {}
        : { fix: "Add a robots.txt at the site root, even a permissive one, with a Sitemap: line in it." }),
    },
    {
      id: "sitemap",
      group: "Findability",
      label: "XML sitemap",
      status: sitemapFromRobots.length > 0 || sitemapProbe?.ok ? OK : "warn",
      found:
        sitemapFromRobots.length > 0
          ? `Listed in robots.txt: ${sitemapFromRobots[0]}`
          : sitemapProbe?.ok
            ? "Found at /sitemap.xml."
            : "No sitemap found in robots.txt or at /sitemap.xml.",
      why: "A sitemap is how a search engine learns about pages nothing links to yet.",
      ...(sitemapFromRobots.length > 0 || sitemapProbe?.ok
        ? {}
        : { fix: "Publish an XML sitemap and reference it from robots.txt with a Sitemap: line." }),
    },
  ];
}

/* ---------------------------------------------------------------- on the page */

/** Google renders titles in a fixed pixel width, not a character count; ~60
 *  characters is the usual point at which an average-width English title starts
 *  being cut. Stated as this tool's rule of thumb, never as a measurement. */
const TITLE_MAX = 60;
const TITLE_MIN = 15;
const DESC_MAX = 160;
const DESC_MIN = 50;

function onThePage({
  clean,
  head,
  metas,
}: {
  clean: string;
  head: string;
  metas: ReturnType<typeof getMetas>;
}): Check[] {
  const title = getTitle(head);
  const description = metaContent(metas, "description");
  const h1s = [...clean.matchAll(/<h1\b[^>]*>/gi)].length;
  const images = getImages(clean);
  const missingAlt = images.filter((img) => img.alt === undefined).length;
  const lang = getHtmlLang(clean);

  const titleStatus = !title
    ? "fail"
    : title.length > TITLE_MAX || title.length < TITLE_MIN
      ? "warn"
      : OK;

  const descStatus = !description
    ? "fail"
    : description.length > DESC_MAX || description.length < DESC_MIN
      ? "warn"
      : OK;

  return [
    {
      id: "title",
      group: "On the page",
      label: "Title tag",
      status: titleStatus,
      found: title
        ? `“${title}” — ${title.length} characters.`
        : "The page has no title tag.",
      why: "The title is the clickable line in search results and the label on the browser tab.",
      ...(titleStatus === OK
        ? {}
        : {
            fix: !title
              ? "Add a <title>. Lead with what the page is about, then the business name."
              : title.length > TITLE_MAX
                ? `Trim it towards ${TITLE_MAX} characters — past roughly that, Google tends to cut the end off.`
                : "It's very short. There's room to say what the page actually offers.",
          }),
    },
    {
      id: "meta-description",
      group: "On the page",
      label: "Meta description",
      status: descStatus,
      found: description
        ? `“${description}” — ${description.length} characters.`
        : "The page has no meta description.",
      why: "It's the sentence under the link in search results — the one that decides whether anyone clicks.",
      ...(descStatus === OK
        ? {}
        : {
            fix: !description
              ? "Add a meta description that describes this page specifically, not the whole business."
              : description.length > DESC_MAX
                ? `Trim towards ${DESC_MAX} characters so the end isn't cut off.`
                : "It's short enough that search engines may write their own instead. Give them something better to use.",
          }),
    },
    {
      id: "h1",
      group: "On the page",
      label: "Main heading",
      status: h1s === 1 ? OK : h1s === 0 ? "fail" : "warn",
      found:
        h1s === 0
          ? "No <h1> on the page."
          : h1s === 1
            ? "One <h1>, as it should be."
            : `${h1s} <h1> headings on one page.`,
      why: "The main heading is the page's one-line answer to “what is this?” — for readers and for crawlers.",
      ...(h1s === 1
        ? {}
        : {
            fix:
              h1s === 0
                ? "Give the page a single <h1> that states what it's for."
                : "Keep one <h1> and step the others down to <h2>.",
          }),
    },
    {
      id: "image-alt",
      group: "On the page",
      label: "Image alt text",
      status: images.length === 0 ? "info" : missingAlt === 0 ? OK : "warn",
      found:
        images.length === 0
          ? "No <img> tags found in the HTML."
          : missingAlt === 0
            ? `All ${images.length} images have an alt attribute.`
            : `${missingAlt} of ${images.length} images have no alt attribute.`,
      why: "Alt text is what a screen reader announces, and what stands in for the image when it fails to load.",
      ...(missingAlt > 0
        ? {
            fix: 'Describe what each image shows. Use alt="" — empty, but present — for images that are purely decorative.',
          }
        : {}),
    },
    {
      id: "lang",
      group: "On the page",
      label: "Page language",
      status: lang ? OK : "warn",
      found: lang ? `Declared as lang="${lang}".` : "The <html> tag has no lang attribute.",
      why: "It tells screen readers which voice to use and browsers whether to offer a translation.",
      ...(lang ? {} : { fix: 'Add lang="en" (or the right code) to the <html> tag.' }),
    },
  ];
}

/* --------------------------------------------------------------- how it shares */

function howItShares({ metas }: { metas: ReturnType<typeof getMetas> }): Check[] {
  const ogTitle = metaContent(metas, "og:title");
  const ogDesc = metaContent(metas, "og:description");
  const ogImage = metaContent(metas, "og:image");
  const present = [ogTitle && "title", ogDesc && "description", ogImage && "image"].filter(
    Boolean,
  ) as string[];

  const status = present.length === 3 ? OK : present.length === 0 ? "fail" : "warn";

  return [
    {
      id: "open-graph",
      group: "How it shares",
      label: "Link preview",
      status,
      found:
        present.length === 0
          ? "No Open Graph tags, so the preview is whatever the app guesses."
          : `Open Graph ${present.join(", ")} present${
              present.length < 3
                ? ` — missing ${["title", "description", "image"].filter((k) => !present.includes(k)).join(" and ")}.`
                : "."
            }`,
      why: "These tags decide what your link looks like when someone pastes it into WhatsApp, LinkedIn or a group chat.",
      ...(status === OK
        ? {}
        : {
            fix: "Add og:title, og:description and og:image. The image wants to be 1200×630 — anything else gets cropped unpredictably.",
          }),
    },
  ];
}

/* ----------------------------------------------------------- getting in touch */

function gettingInTouch({
  clean,
  metas,
}: {
  clean: string;
  metas: ReturnType<typeof getMetas>;
}): Check[] {
  const hrefs = getAnchorHrefs(clean);
  const channels: string[] = [];
  if (hrefs.some((h) => /^tel:/i.test(h))) channels.push("a tap-to-call number");
  if (hrefs.some((h) => /^mailto:/i.test(h))) channels.push("an email link");
  if (hrefs.some((h) => /(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)/i.test(h))) {
    channels.push("a WhatsApp link");
  }

  const viewport = metaContent(metas, "viewport");

  return [
    {
      id: "one-tap-contact",
      group: "Getting in touch",
      label: "One-tap contact",
      status: channels.length > 0 ? OK : "warn",
      found:
        channels.length > 0
          ? `The page has ${channels.join(", ")}.`
          : "No tel:, mailto: or WhatsApp link anywhere on the page.",
      why: "On a phone, a number that isn't a link has to be memorised, retyped, and usually isn't.",
      ...(channels.length > 0
        ? {}
        : {
            fix: "Make the phone number a tel: link and add a WhatsApp link. It's the shortest path between a visitor and a conversation.",
          }),
    },
    {
      id: "viewport",
      group: "Getting in touch",
      label: "Mobile viewport",
      status: viewport ? OK : "fail",
      found: viewport
        ? `Declared as “${viewport}”.`
        : "No viewport meta tag, so phones will render the page at desktop width and zoom out.",
      why: "Without it, a phone shows a shrunk-down desktop page that has to be pinched to read.",
      ...(viewport
        ? {}
        : { fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.' }),
    },
  ];
}

/* -------------------------------------------------------------------- delivery */

const TTFB_GOOD_MS = 1000;
const TTFB_POOR_MS = 2500;
const HTML_GOOD_BYTES = 150_000;
const HTML_POOR_BYTES = 500_000;

function delivery({
  page,
  raw,
  head,
}: {
  page: Awaited<ReturnType<typeof fetchPage>>;
  raw: string;
  head: string;
}): Check[] {
  const bytes = Buffer.byteLength(raw, "utf8");
  const blocking = countBlockingScripts(head);
  const { types, invalid } = getJsonLd(raw);
  const hops = page.redirects.length;

  const ttfbStatus =
    page.ttfbMs <= TTFB_GOOD_MS ? OK : page.ttfbMs <= TTFB_POOR_MS ? "warn" : "fail";
  const weightStatus =
    bytes <= HTML_GOOD_BYTES ? OK : bytes <= HTML_POOR_BYTES ? "warn" : "fail";

  return [
    {
      id: "response-time",
      group: "Delivery",
      label: "Server response",
      status: ttfbStatus,
      /* The caveat is inside the finding, not in a footnote, because the number
       * is genuinely one sample from one machine and reading it as "your site
       * speed" would be reading it wrong. */
      found: `${(page.ttfbMs / 1000).toFixed(2)}s to the first byte — one request, from our server, just now.`,
      why: "It's how long the server thought before it said anything. Everything else on the page waits behind it.",
      ...(ttfbStatus === OK
        ? {}
        : {
            fix: "Usually caching, a cheap shared host, or a slow database query. Worth confirming with a proper speed test before spending money on it.",
          }),
    },
    {
      id: "html-weight",
      group: "Delivery",
      label: "HTML size",
      status: weightStatus,
      found: `${Math.round(bytes / 1024)} KB of HTML${page.truncated ? " (we stopped reading at 2 MB)" : ""}. This is the document only — images, scripts and fonts are extra.`,
      why: "The HTML has to arrive and be read before anything appears, so its size sets the floor for how fast the page can feel.",
      ...(weightStatus === OK
        ? {}
        : {
            fix: "Large HTML usually means a page builder emitting inline styles, or a whole catalogue rendered into one document.",
          }),
    },
    {
      id: "blocking-scripts",
      group: "Delivery",
      label: "Render-blocking scripts",
      status: blocking === 0 ? OK : blocking <= 2 ? "warn" : "fail",
      found:
        blocking === 0
          ? "No blocking scripts in the <head>."
          : `${blocking} script${blocking === 1 ? "" : "s"} in the <head> with neither defer nor async.`,
      why: "The browser stops building the page while it downloads and runs each one.",
      ...(blocking === 0
        ? {}
        : { fix: "Add defer to scripts that don't have to run before the page draws — which is nearly all of them." }),
    },
    {
      id: "structured-data",
      group: "Delivery",
      label: "Structured data",
      status: invalid > 0 ? "fail" : types.length > 0 ? OK : "warn",
      found:
        invalid > 0
          ? `${invalid} JSON-LD block${invalid === 1 ? "" : "s"} could not be parsed.`
          : types.length > 0
            ? `Found: ${types.slice(0, 8).join(", ")}.`
            : "No JSON-LD structured data on the page.",
      why: "It's how a search engine reads what kind of thing the page describes — a business, a product, a question — rather than guessing from the words.",
      ...(invalid > 0
        ? { fix: "A JSON syntax error means the block is ignored entirely. Run it through a validator." }
        : types.length > 0
          ? {}
          : {
              fix: "For a local business, an Organization or LocalBusiness block with the real name, address and phone number is the place to start.",
            }),
    },
    {
      id: "redirects",
      group: "Delivery",
      label: "Redirects",
      status: hops <= 1 ? OK : "warn",
      found:
        hops === 0
          ? "The address loaded directly, with no redirect."
          : hops === 1
            ? "One redirect — normal for http→https or a www rule."
            : `${hops} redirects before the page loaded.`,
      why: "Each hop is another round trip the visitor waits through before anything renders.",
      ...(hops <= 1
        ? {}
        : { fix: "Collapse the chain so the first address goes straight to the final one." }),
    },
  ];
}
