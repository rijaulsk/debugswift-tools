import {
  fetchPage,
  FetchPageError,
  headSize,
  probe,
  statusOf,
} from "@/lib/audit/fetchPage";
import {
  attrs,
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
 * `fixWith` is what makes this more than a list of complaints: where a tool in
 * this repo actually does the job, the finding carries a link into it with the
 * value already filled in. A report that tells you your title is 74 characters
 * and then leaves you to retype it somewhere else has done half a job.
 *
 * Adding a check: append it, give it a stable id, put it in a group, and bump
 * TOTAL_CHECKS. The score is counted from the array, so the denominator follows
 * automatically. */

const OK = "pass" as const;

/**
 * How many checks run. The page prose quotes this number, so it cannot live
 * only in their heads.
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
export const TOTAL_CHECKS = 34;

/** How many images to weigh. Each one is an outbound HEAD request, so this is
 *  a deliberate cap on what one audit costs us and the target site. */
const IMAGE_SAMPLE = 8;

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

  /* Everything that needs its own request, gathered once and in parallel.
   * robots.txt is fetched from the FINAL url's origin: after a redirect from
   * example.com to www.example.com, the file that governs the page we measured
   * is the one on www. */
  const [robots, softFourOhFour, altHostStatus] = await Promise.all([
    probe(new URL("/robots.txt", final.origin)),
    statusOf(new URL(`/${randomProbePath()}`, final.origin)),
    checkAltHost(final),
  ]);

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

  const ogImage = metaContent(metas, "og:image");
  const ogImageStatus = ogImage ? await statusOf(absolute(ogImage, final)!) : null;

  const imageWeight = await weighImages(clean, final);

  const checks: Check[] = [
    ...findability({
      final,
      metas,
      links,
      headers: page.headers,
      robots,
      sitemapFromRobots,
      sitemapProbe,
      softFourOhFour,
      altHostStatus,
    }),
    ...onThePage({ clean, head, metas }),
    ...howItShares({ metas, ogImage, ogImageStatus }),
    ...gettingInTouch({ clean, metas }),
    ...delivery({ page, raw, clean, head, final, imageWeight }),
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

/* ------------------------------------------------------------------ helpers */

/** A path that should not exist, for the soft-404 probe. */
function randomProbePath(): string {
  return `debugswift-audit-${Math.random().toString(36).slice(2, 10)}`;
}

function absolute(href: string, base: URL): URL | null {
  try {
    const url = new URL(href, base);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** Does the other of www/non-www redirect here, or serve a duplicate site? */
async function checkAltHost(final: URL): Promise<number | null> {
  const host = final.hostname;
  const alt = host.startsWith("www.")
    ? host.slice(4)
    : host.split(".").length === 2
      ? `www.${host}`
      : null;
  if (!alt) return null;
  const target = new URL(final.toString());
  target.hostname = alt;
  return statusOf(target);
}

type ImageWeight = {
  total: number;
  measured: number;
  sampled: number;
  largest: { src: string; bytes: number } | null;
  modern: number;
  legacy: number;
};

async function weighImages(clean: string, base: URL): Promise<ImageWeight> {
  const srcs = [
    ...new Set(
      getImages(clean)
        .map((i) => i.src)
        .filter((s): s is string => !!s && !s.startsWith("data:")),
    ),
  ];

  const modern = srcs.filter((s) => /\.(webp|avif)(\?|$)/i.test(s)).length;
  const legacy = srcs.filter((s) => /\.(jpe?g|png)(\?|$)/i.test(s)).length;

  const sample = srcs.slice(0, IMAGE_SAMPLE);
  const sizes = await Promise.all(
    sample.map(async (src) => {
      const url = absolute(src, base);
      if (!url) return { src, bytes: null };
      return { src, bytes: await headSize(url) };
    }),
  );

  const measured = sizes.filter((s) => s.bytes !== null);
  const total = measured.reduce((sum, s) => sum + (s.bytes ?? 0), 0);
  const largest = measured.reduce<{ src: string; bytes: number } | null>(
    (best, s) => (s.bytes! > (best?.bytes ?? 0) ? { src: s.src, bytes: s.bytes! } : best),
    null,
  );

  return { total, measured: measured.length, sampled: srcs.length, largest, modern, legacy };
}

const kb = (bytes: number) => `${Math.round(bytes / 1024)} KB`;

/* ---------------------------------------------------------------- findability */

function findability({
  final,
  metas,
  links,
  headers,
  robots,
  sitemapFromRobots,
  sitemapProbe,
  softFourOhFour,
  altHostStatus,
}: {
  final: URL;
  metas: ReturnType<typeof getMetas>;
  links: { rel: string; href: string }[];
  headers: Headers;
  robots: { ok: boolean; text: string };
  sitemapFromRobots: (string | undefined)[];
  sitemapProbe: { ok: boolean } | null;
  softFourOhFour: number;
  altHostStatus: number | null;
}): Check[] {
  const https = final.protocol === "https:";
  const robotsMeta = metaContent(metas, "robots") ?? "";
  const xRobots = headers.get("x-robots-tag") ?? "";
  const noindex = /noindex/i.test(robotsMeta) || /noindex/i.test(xRobots);
  const canonical = links.find((l) => l.rel.split(/\s+/).includes("canonical"));
  const hsts = headers.get("strict-transport-security");

  /* Does robots.txt disallow the page we just audited? A blanket Disallow: /
   * left over from a staging site is one of the most expensive one-line
   * mistakes on the web, and nothing on the page itself shows it. */
  const disallowed = robots.ok && blocksPath(robots.text, final.pathname);

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
      ...(https
        ? {}
        : { fix: "Install a certificate and redirect every http:// address to https://." }),
    },
    {
      id: "hsts",
      group: "Findability",
      label: "HTTPS enforced",
      status: !https ? "fail" : hsts ? OK : "warn",
      found: !https
        ? "Not applicable until the site is on HTTPS."
        : hsts
          ? `Strict-Transport-Security is set (${hsts.slice(0, 60)}).`
          : "No Strict-Transport-Security header.",
      why: "It tells browsers to never even try the insecure version, closing the gap on the very first visit.",
      ...(https && !hsts
        ? {
            fix: "Add a Strict-Transport-Security header. Start with a short max-age until you're sure every subdomain is on HTTPS.",
          }
        : {}),
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
      id: "robots-allows",
      group: "Findability",
      label: "robots.txt allows this page",
      status: disallowed ? "fail" : OK,
      found: disallowed
        ? "robots.txt tells crawlers not to fetch this path."
        : robots.ok
          ? "Nothing in robots.txt blocks this page."
          : "No robots.txt, so nothing is blocked.",
      why: "A leftover Disallow rule keeps a page out of search while the page itself looks perfectly fine.",
      ...(disallowed
        ? { fix: "Remove or narrow the Disallow rule covering this path in robots.txt." }
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
        : { fix: 'Add <link rel="canonical" href="…"> pointing at this page\'s preferred address.' }),
    },
    {
      id: "www-canonical",
      group: "Findability",
      label: "One address, not two",
      status:
        altHostStatus === null
          ? "info"
          : altHostStatus === 0 || (altHostStatus >= 300 && altHostStatus < 400)
            ? OK
            : altHostStatus === 200
              ? "warn"
              : OK,
      found:
        altHostStatus === null
          ? "Couldn't test the www/non-www pair for this hostname."
          : altHostStatus === 0
            ? "The other of www/non-www doesn't resolve, so there's only one address."
            : altHostStatus === 200
              ? "Both the www and non-www addresses serve the page directly."
              : `The other of www/non-www answers ${altHostStatus}, so it isn't a duplicate.`,
      why: "If both addresses serve the same site, search engines have to guess which one is real and any credit gets split.",
      ...(altHostStatus === 200
        ? {
            fix: "Pick one and permanently redirect the other to it. A canonical tag helps but a 301 is the real fix.",
          }
        : {}),
    },
    {
      id: "soft-404",
      group: "Findability",
      label: "Missing pages return 404",
      status: softFourOhFour === 404 || softFourOhFour === 410 ? OK : "warn",
      found:
        softFourOhFour === 0
          ? "Couldn't test — the probe request didn't complete."
          : softFourOhFour === 404 || softFourOhFour === 410
            ? `A made-up address correctly returned ${softFourOhFour}.`
            : `A made-up address returned ${softFourOhFour} instead of 404.`,
      why: "When missing pages answer “200 OK”, search engines index endless addresses that don't exist.",
      ...(softFourOhFour !== 404 && softFourOhFour !== 410 && softFourOhFour !== 0
        ? {
            fix: "Make the not-found page return a real 404 status. Showing a friendly message is fine; claiming success isn't.",
          }
        : {}),
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
        : {
            fix: "Add a robots.txt at the site root, even a permissive one, with a Sitemap: line in it.",
          }),
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
        : {
            fix: "Publish an XML sitemap and reference it from robots.txt with a Sitemap: line.",
          }),
    },
  ];
}

/** Crude robots.txt evaluation for the generic user-agent. Deliberately
 *  conservative: only an exact-prefix Disallow under `User-agent: *` counts, so
 *  the check reports a block only when it is unambiguous. */
function blocksPath(robotsText: string, path: string): boolean {
  const lines = robotsText.split(/\r?\n/).map((l) => l.trim());
  let inStar = false;
  let blocked = false;
  for (const line of lines) {
    const ua = line.match(/^user-agent\s*:\s*(.+)$/i);
    if (ua) {
      inStar = ua[1]!.trim() === "*";
      continue;
    }
    if (!inStar) continue;
    const dis = line.match(/^disallow\s*:\s*(\S*)$/i);
    if (dis) {
      const rule = dis[1] ?? "";
      if (rule !== "" && path.startsWith(rule)) blocked = true;
    }
    const allow = line.match(/^allow\s*:\s*(\S*)$/i);
    if (allow && allow[1] && path.startsWith(allow[1])) blocked = false;
  }
  return blocked;
}

/* ---------------------------------------------------------------- on the page */

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
  const headingProblem = headingOrderProblem(clean);

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
                ? `Trim it towards ${TITLE_MAX} characters — past roughly that, Google tends to cut the end off. Character count is a rough guide; Google actually cuts by pixel width.`
                : "It's very short. There's room to say what the page actually offers.",
          }),
      /* Always offered, even on a pass: the character count here is an
       * approximation and the meta generator measures the real pixel width,
       * which is what Google truncates on. */
      ...(title
        ? {
            fixWith: {
              slug: "meta-generator",
              label: "Measure it properly",
              params: { title, ...(description ? { description } : {}) },
            },
          }
        : {
            fixWith: {
              slug: "meta-generator",
              label: "Write one",
              params: {},
            },
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
      ...(descStatus === OK
        ? {}
        : {
            fixWith: {
              slug: "meta-generator",
              label: "Fix it here",
              params: { ...(title ? { title } : {}), ...(description ? { description } : {}) },
            },
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
      id: "heading-order",
      group: "On the page",
      label: "Heading order",
      status: headingProblem ? "warn" : OK,
      found: headingProblem ?? "Headings step down one level at a time.",
      why: "Screen-reader users navigate by heading level, and a skipped level reads as a missing section.",
      ...(headingProblem
        ? {
            fix: "Use heading levels for structure, not for size — style them with CSS instead of picking a bigger tag.",
          }
        : {}),
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

/** First skipped heading level, or null. */
function headingOrderProblem(clean: string): string | null {
  const levels = [...clean.matchAll(/<h([1-6])\b[^>]*>/gi)].map((m) => Number(m[1]));
  let previous = 0;
  for (const level of levels) {
    if (previous && level > previous + 1) {
      return `A heading jumps from h${previous} straight to h${level}.`;
    }
    previous = level;
  }
  return null;
}

/* --------------------------------------------------------------- how it shares */

function howItShares({
  metas,
  ogImage,
  ogImageStatus,
}: {
  metas: ReturnType<typeof getMetas>;
  ogImage: string | undefined;
  ogImageStatus: number | null;
}): Check[] {
  const ogTitle = metaContent(metas, "og:title");
  const ogDesc = metaContent(metas, "og:description");
  const present = [ogTitle && "title", ogDesc && "description", ogImage && "image"].filter(
    Boolean,
  ) as string[];
  const status = present.length === 3 ? OK : present.length === 0 ? "fail" : "warn";

  const twitter = metaContent(metas, "twitter:card");

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
                ? ` — missing ${["title", "description", "image"]
                    .filter((k) => !present.includes(k))
                    .join(" and ")}.`
                : "."
            }`,
      why: "These tags decide what your link looks like when someone pastes it into WhatsApp, LinkedIn or a group chat.",
      ...(status === OK
        ? {}
        : {
            fix: "Add og:title, og:description and og:image. The image wants to be 1200×630 — anything else gets cropped unpredictably.",
          }),
    },
    {
      id: "og-image-loads",
      group: "How it shares",
      label: "Preview image actually loads",
      status:
        ogImageStatus === null
          ? "info"
          : ogImageStatus === 200
            ? OK
            : "fail",
      found:
        ogImageStatus === null
          ? "No og:image to test."
          : ogImageStatus === 200
            ? "The preview image loaded successfully."
            : ogImageStatus === 0
              ? "The preview image address couldn't be reached at all."
              : `The preview image returned ${ogImageStatus}.`,
      why: "A declared preview image that 404s gives you a blank card — worse than declaring none, because you think it's handled.",
      ...(ogImageStatus !== null && ogImageStatus !== 200
        ? {
            fix: "Point og:image at a full absolute address that loads in a private window. Relative paths and staging URLs are the usual culprits.",
          }
        : {}),
    },
    {
      id: "twitter-card",
      group: "How it shares",
      label: "Large preview on X",
      status: twitter ? OK : "warn",
      found: twitter
        ? `twitter:card is “${twitter}”.`
        : "No twitter:card tag, so links may render as a small thumbnail.",
      why: "Without it, a shared link often gets a cramped preview instead of the full-width card.",
      ...(twitter
        ? {}
        : { fix: 'Add <meta name="twitter:card" content="summary_large_image">.' }),
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
  const hasTel = hrefs.some((h) => /^tel:/i.test(h));
  const hasWhatsapp = hrefs.some((h) =>
    /(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)/i.test(h),
  );
  if (hasTel) channels.push("a tap-to-call number");
  if (hrefs.some((h) => /^mailto:/i.test(h))) channels.push("an email link");
  if (hasWhatsapp) channels.push("a WhatsApp link");

  const viewport = metaContent(metas, "viewport");
  const hasForm = /<form\b/i.test(clean);
  const hasMap = hrefs.some((h) =>
    /(google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(h),
  );

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
      ...(hasWhatsapp
        ? {}
        : {
            fixWith: {
              slug: "qr-generator",
              label: "Make a WhatsApp QR",
              params: { kind: "whatsapp" },
            },
          }),
    },
    {
      id: "enquiry-form",
      group: "Getting in touch",
      label: "A way to enquire without phoning",
      status: hasForm || channels.length > 1 ? OK : "warn",
      found: hasForm
        ? "There's a form on the page."
        : channels.length > 1
          ? "No form, but more than one direct channel is offered."
          : "No form, and only one way to make contact.",
      why: "Plenty of people will not ring a stranger, and will leave rather than call.",
      ...(!hasForm && channels.length <= 1
        ? { fix: "Add a short form — a name, a way to reply, and one question about what they need." }
        : {}),
    },
    {
      id: "map-link",
      group: "Getting in touch",
      label: "Findable on a map",
      status: hasMap ? OK : "warn",
      found: hasMap
        ? "The page links to a map listing."
        : "No link to Google Maps or a business listing.",
      why: "For a local business, the map listing is often where customers actually arrive from — and where they check you're real.",
      ...(hasMap
        ? {}
        : {
            fix: "Link to your Google Business Profile. If you don't have one, that's usually a bigger win than anything else on this list.",
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
        : {
            fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
          }),
    },
  ];
}

/* -------------------------------------------------------------------- delivery */

const TTFB_GOOD_MS = 1000;
const TTFB_POOR_MS = 2500;
const HTML_GOOD_BYTES = 150_000;
const HTML_POOR_BYTES = 500_000;
const IMAGES_GOOD_BYTES = 500_000;
const IMAGES_POOR_BYTES = 1_500_000;

function delivery({
  page,
  raw,
  clean,
  head,
  final,
  imageWeight,
}: {
  page: Awaited<ReturnType<typeof fetchPage>>;
  raw: string;
  clean: string;
  head: string;
  final: URL;
  imageWeight: ImageWeight;
}): Check[] {
  const bytes = Buffer.byteLength(raw, "utf8");
  const blocking = countBlockingScripts(head);
  const { types, invalid } = getJsonLd(raw);
  const hops = page.redirects.length;
  const encoding = page.headers.get("content-encoding");
  const cacheControl = page.headers.get("cache-control");

  const imgs = getImages(clean);
  const missingDims = imgs.filter((i) => {
    const tag = i.src ?? "";
    return tag !== "" && !hasBothDimensions(clean, tag);
  }).length;
  const lazy = countLazy(clean);

  const mixed = final.protocol === "https:" ? countMixedContent(clean) : 0;

  const ttfbStatus =
    page.ttfbMs <= TTFB_GOOD_MS ? OK : page.ttfbMs <= TTFB_POOR_MS ? "warn" : "fail";
  const weightStatus =
    bytes <= HTML_GOOD_BYTES ? OK : bytes <= HTML_POOR_BYTES ? "warn" : "fail";
  const imageStatus =
    imageWeight.measured === 0
      ? "info"
      : imageWeight.total <= IMAGES_GOOD_BYTES
        ? OK
        : imageWeight.total <= IMAGES_POOR_BYTES
          ? "warn"
          : "fail";

  return [
    {
      id: "response-time",
      group: "Delivery",
      label: "Server response",
      status: ttfbStatus,
      found: `${(page.ttfbMs / 1000).toFixed(2)}s to the first byte — one request, from our server, just now.`,
      why: "It's how long the server thought before it said anything. Everything else on the page waits behind it.",
      ...(ttfbStatus === OK
        ? {}
        : {
            fix: "Usually caching, a cheap shared host, or a slow database query. Worth confirming with a proper speed test before spending money on it.",
          }),
    },
    {
      id: "image-weight",
      group: "Delivery",
      label: "Image weight",
      status: imageStatus,
      found:
        imageWeight.measured === 0
          ? imageWeight.sampled === 0
            ? "No images to weigh on this page."
            : "Couldn't measure the images — the server didn't report their sizes."
          : `${kb(imageWeight.total)} across ${imageWeight.measured} image${imageWeight.measured === 1 ? "" : "s"}${imageWeight.sampled > imageWeight.measured ? ` (of ${imageWeight.sampled} found — we weigh the first ${IMAGE_SAMPLE})` : ""}.${
              imageWeight.largest
                ? ` Largest: ${kb(imageWeight.largest.bytes)} — ${imageWeight.largest.src.slice(0, 70)}`
                : ""
            }`,
      why: "On most small-business sites the single biggest thing a visitor downloads is a photo nobody resized.",
      ...(imageStatus === OK || imageStatus === "info"
        ? {}
        : {
            fix: "Resize each image to the size it's actually displayed at and re-encode it. This is usually the largest speed win available, and it's free.",
          }),
      ...(imageStatus === "warn" || imageStatus === "fail"
        ? { fixWith: { slug: "image-compressor", label: "Compress them", params: {} } }
        : {}),
    },
    {
      id: "modern-formats",
      group: "Delivery",
      label: "Modern image formats",
      status:
        imageWeight.legacy === 0 && imageWeight.modern === 0
          ? "info"
          : imageWeight.legacy === 0
            ? OK
            : "warn",
      found:
        imageWeight.legacy === 0 && imageWeight.modern === 0
          ? "No file-based images to check."
          : imageWeight.legacy === 0
            ? `All ${imageWeight.modern} images are WebP or AVIF.`
            : `${imageWeight.legacy} JPEG/PNG image${imageWeight.legacy === 1 ? "" : "s"}${imageWeight.modern ? `, ${imageWeight.modern} already modern` : ""}.`,
      why: "WebP is meaningfully smaller than JPEG at the same visual quality, and every current browser reads it.",
      ...(imageWeight.legacy > 0
        ? { fix: "Re-encode them as WebP. Keep a JPEG fallback only if you support genuinely old browsers." }
        : {}),
      ...(imageWeight.legacy > 0
        ? { fixWith: { slug: "image-compressor", label: "Convert to WebP", params: {} } }
        : {}),
    },
    {
      id: "image-dimensions",
      group: "Delivery",
      label: "Images reserve their space",
      status: imgs.length === 0 ? "info" : missingDims === 0 ? OK : "warn",
      found:
        imgs.length === 0
          ? "No images on the page."
          : missingDims === 0
            ? `All ${imgs.length} images declare width and height.`
            : `${missingDims} of ${imgs.length} images have no width and height.`,
      why: "Without them the page reflows as each image arrives, and whatever someone was about to tap jumps away.",
      ...(missingDims > 0
        ? { fix: "Add width and height attributes matching the image's real proportions. CSS can still resize it." }
        : {}),
    },
    {
      id: "lazy-loading",
      group: "Delivery",
      label: "Off-screen images deferred",
      status: imgs.length < 4 ? "info" : lazy > 0 ? OK : "warn",
      found:
        imgs.length < 4
          ? "Too few images for this to matter."
          : lazy > 0
            ? `${lazy} of ${imgs.length} images are lazy-loaded.`
            : `None of the ${imgs.length} images are lazy-loaded.`,
      why: "Images far down the page compete for bandwidth with the part someone is actually looking at.",
      ...(imgs.length >= 4 && lazy === 0
        ? {
            fix: 'Add loading="lazy" to images below the fold. Leave it OFF the main image at the top — deferring that one makes the page feel slower.',
          }
        : {}),
    },
    {
      id: "compression",
      group: "Delivery",
      label: "Text compression",
      status: encoding ? OK : "warn",
      found: encoding
        ? `The server sent the page ${encoding}-compressed.`
        : "The page was sent uncompressed.",
      why: "HTML compresses to a fraction of its size, and turning it on is a server setting rather than a project.",
      ...(encoding
        ? {}
        : { fix: "Enable gzip or brotli compression on the server. It's usually one line of configuration." }),
    },
    {
      id: "caching",
      group: "Delivery",
      label: "Caching instructions",
      status: cacheControl ? OK : "warn",
      found: cacheControl
        ? `Cache-Control: ${cacheControl.slice(0, 70)}`
        : "No Cache-Control header on the page.",
      why: "Without it, browsers and CDNs have to guess how long anything can be reused, and mostly they don't.",
      ...(cacheControl
        ? {}
        : {
            fix: "Set Cache-Control. Short for HTML, long for images, CSS and scripts that carry a version in their filename.",
          }),
    },
    {
      id: "mixed-content",
      group: "Delivery",
      label: "No insecure resources",
      status: final.protocol !== "https:" ? "info" : mixed === 0 ? OK : "fail",
      found:
        final.protocol !== "https:"
          ? "Not applicable — the page itself isn't on HTTPS."
          : mixed === 0
            ? "Everything the page loads is over HTTPS."
            : `${mixed} resource${mixed === 1 ? "" : "s"} loaded over plain http://.`,
      why: "Browsers block insecure images and scripts on a secure page, so they simply don't appear.",
      ...(mixed > 0
        ? { fix: "Change those http:// addresses to https://, or host the files yourself." }
        : {}),
    },
    {
      id: "html-weight",
      group: "Delivery",
      label: "HTML size",
      status: weightStatus,
      found: `${kb(bytes)} of HTML${page.truncated ? " (we stopped reading at 2 MB)" : ""}. This is the document only — images, scripts and fonts are counted separately.`,
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
        : {
            fix: "Add defer to scripts that don't have to run before the page draws — which is nearly all of them.",
          }),
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
      ...(types.length === 0 || invalid > 0
        ? {
            fixWith: {
              slug: "schema-generator",
              label: "Generate the markup",
              params: {},
            },
          }
        : {}),
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

function hasBothDimensions(clean: string, src: string): boolean {
  const escaped = src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = clean.match(new RegExp(`<img\\b[^>]*${escaped}[^>]*>`, "i"));
  if (!match) return false;
  const a = attrs(match[0]);
  return "width" in a && "height" in a;
}

function countLazy(clean: string): number {
  return [...clean.matchAll(/<img\b[^>]*>/gi)].filter(
    (m) => attrs(m[0]).loading?.toLowerCase() === "lazy",
  ).length;
}

/** http:// references in src/href attributes of subresources on an https page. */
function countMixedContent(clean: string): number {
  let n = 0;
  for (const m of clean.matchAll(/<(img|script|iframe|audio|video|source)\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    if (a.src?.startsWith("http://")) n += 1;
  }
  for (const m of clean.matchAll(/<link\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    if (a.rel?.toLowerCase().includes("stylesheet") && a.href?.startsWith("http://")) n += 1;
  }
  return n;
}
