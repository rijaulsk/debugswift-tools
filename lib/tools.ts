/* THE TOOL REGISTRY — the reason this is one repo and not seven.
 *
 * Adding a tool is two moves: an entry here, and a route folder named for its
 * slug. The hub page, the sitemap, and the cross-links between tools all read
 * from this array, and NOTHING in the main marketing repo has to change. That
 * property is the whole argument for the single-repo shape recorded in
 * E:\debugswift\debugswift-assets\tools-repo-spec.md — do not break it by
 * hand-listing tools anywhere else.
 *
 * `status` is load-bearing and it is an honesty mechanism. Only "live" tools get
 * a route, a link, and a sitemap entry. "planned" tools render as plain text on
 * the hub — named, not linked — because a link to a page that does not exist is
 * a lie a visitor discovers by clicking. Do not add a route for a planned tool
 * without flipping its status, and do not flip its status before the route
 * works end to end.
 *
 * Menu and order are locked by the brief (§5) and by the tools-repo spec: the
 * website audit ships FIRST because it is the best capture and it matches the
 * automation spearhead. Do not reorder to put a cheaper tool first. */

export type ToolStatus = "live" | "planned";

export type Tool = {
  /** URL segment. Lives at debugswift.com/tools/<slug>. Never rename a live
   *  one — that discards whatever the page has earned. */
  slug: string;
  name: string;
  /** Hub card line and the source of the page's meta description. One sentence,
   *  says what the tool DOES, never what it will do for your business. */
  oneLiner: string;
  status: ToolStatus;
  /** Slug of the main-site service this tool feeds. Every tool page links to
   *  its service page — that internal link is half the point of the tools
   *  existing (SEO architecture: tools ↔ blog ↔ service pages). */
  relatedService: string;
};

export const tools: Tool[] = [
  {
    slug: "website-audit",
    name: "Website Audit",
    oneLiner:
      "Checks a page for the technical and on-page basics search engines and customers both rely on.",
    status: "live",
    relatedService: "seo-local-lead-gen",
  },
  {
    slug: "meta-generator",
    name: "Meta & Headline Generator",
    oneLiner:
      "Shows exactly where Google cuts your title tag — measured in pixels, not characters.",
    status: "live",
    relatedService: "seo-local-lead-gen",
  },
  {
    slug: "quote-generator",
    name: "Quote & Invoice Generator",
    oneLiner:
      "Fills a clean, printable quote or invoice and saves it as a PDF from your browser.",
    status: "live",
    relatedService: "business-process-automation",
  },
  {
    slug: "brand-kit",
    name: "Brand Kit Generator",
    oneLiner:
      "Turns one colour into a ten-step palette with contrast measured on every step, plus a type scale.",
    status: "live",
    relatedService: "brand-design-systems",
  },
  {
    slug: "qr-generator",
    name: "QR Code Generator",
    oneLiner:
      "Makes a vector QR code for a link, phone number or WhatsApp chat — with no redirect that can expire.",
    status: "live",
    relatedService: "conversion-websites",
  },
  {
    slug: "image-compressor",
    name: "Image Compressor",
    oneLiner:
      "Shrinks photos on your own device so a page stops waiting on them. Nothing is uploaded.",
    status: "live",
    relatedService: "web-app-development",
  },
  {
    /* RENAMED FROM "cost-estimator", 28 Jul 2026, and the rename is the whole
     * point rather than cosmetic. The brief's menu called for a cost estimator;
     * the brief ALSO locks "no public pricing on the website", and the rupee
     * ranges that exist are recorded as internal anchors, explicitly not
     * published. A calculator printing rupees would break the second rule to
     * satisfy the first and leak the anchors doing it.
     *
     * So it scopes instead of pricing, and it is named for what it does. The
     * page answers "what does it cost?" directly — by explaining why we quote
     * after a conversation, which is a real answer rather than a dodge.
     *
     * FLAGGED FOR THE OWNER: if you want a genuine price calculator, that is a
     * positioning decision to make deliberately, not a tool to add quietly. */
    slug: "project-scoper",
    name: "Project Scoper",
    oneLiner:
      "Turns a vague idea into a written brief, so three quotes are finally comparable.",
    status: "live",
    relatedService: "technical-consulting",
  },
];

export const liveTools = tools.filter((t) => t.status === "live");

export function getTool(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}

/** Live tools other than the one given — the "while you're here" row at the
 *  bottom of each tool page. Returns [] while only one tool exists, and the
 *  caller must render nothing rather than an empty heading. */
export function otherLiveTools(slug: string): Tool[] {
  return liveTools.filter((t) => t.slug !== slug);
}
