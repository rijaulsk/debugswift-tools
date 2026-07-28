import { SITE_URL, siteUrl, toolUrl } from "@/lib/links";
import type { FaqItem } from "@/lib/types";
import type { Tool } from "@/lib/tools";

/* Structured data.
 *
 * Every builder here emits nodes that reference the two @ids declared in the
 * MAIN site's app/layout.tsx — https://debugswift.com/#org and /#website. That
 * is what makes three deployments describe one company instead of three: this
 * app is served from a different origin, so nothing about the main site's markup
 * is present in these documents, and a `publisher` written out longhand on each
 * tool page would drift from the main site's the first time either changed.
 *
 * NOTHING HERE INVENTS A VALUE. In particular: SoftwareApplication markup invites
 * an `aggregateRating`, and this repo will never carry one. There are no reviews,
 * so there is no rating — a fabricated one is both a lie and a manual-action risk.
 * Same for `interactionStatistic` (usage counts). If a rating ever appears in
 * this file, it is a defect, not a feature. */

type JsonLdNode = Record<string, unknown>;

const ORG = { "@id": `${SITE_URL}/#org` };
const WEBSITE = { "@id": `${SITE_URL}/#website` };

export function breadcrumbJsonLd(
  trail: { name: string; url: string }[],
): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function faqPageJsonLd(faqs: FaqItem[]): JsonLdNode | null {
  if (!faqs.length) return null;
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/**
 * A tool, as a WebApplication.
 *
 * `offers` at price 0 is the honest description of the thing and the field that
 * makes "free" machine-readable rather than a marketing adjective. It is also
 * the claim the site has to keep: put any tool behind a payment or a mandatory
 * signup and this node has to change with it.
 */
export function webApplicationJsonLd(tool: Tool): JsonLdNode {
  const url = toolUrl(`/${tool.slug}`);
  return {
    "@type": "WebApplication",
    "@id": `${url}#app`,
    name: tool.name,
    description: tool.oneLiner,
    url,
    applicationCategory: "BusinessApplication",
    /* It runs in the browser. Naming a required browser rather than an OS is
     * the accurate answer for a web app. */
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript.",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "INR",
    },
    publisher: ORG,
    isPartOf: WEBSITE,
    inLanguage: "en",
  };
}

export function collectionPageJsonLd({
  name,
  description,
  url,
  items,
}: {
  name: string;
  description: string;
  url: string;
  items: { name: string; url: string }[];
}): JsonLdNode {
  return {
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    name,
    description,
    url,
    isPartOf: WEBSITE,
    publisher: ORG,
    inLanguage: "en",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: item.url,
        name: item.name,
      })),
    },
  };
}

export function toolBreadcrumbs(tool: Tool): { name: string; url: string }[] {
  return [
    { name: "Home", url: siteUrl("/") },
    { name: "Free Tools", url: toolUrl("/") },
    { name: tool.name, url: toolUrl(`/${tool.slug}`) },
  ];
}

/** Everything a tool page needs, in one @graph. */
export function toolGraph(tool: Tool, faqs: FaqItem[]): JsonLdNode {
  const nodes: (JsonLdNode | null)[] = [
    webApplicationJsonLd(tool),
    breadcrumbJsonLd(toolBreadcrumbs(tool)),
    faqPageJsonLd(faqs),
  ];
  return { "@context": "https://schema.org", "@graph": nodes.filter(Boolean) };
}

/** Serialisable <script> payload. */
export function jsonLdScript(data: unknown): string {
  /* "</script>" inside a JSON string would close the tag early — the one real
   * injection risk in inlined JSON-LD, and audit results echo strings that came
   * off somebody else's web page. */
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
