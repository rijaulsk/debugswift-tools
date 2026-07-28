/* Navigation-only slice of the main site's service catalogue.
 *
 * SOURCE OF TRUTH: E:\debugswift\lib\services.ts. That file is ~470 lines of
 * page copy (problem, deliverables, scenario, FAQ, closing CTA per service) and
 * the Header dropdown and Footer read four fields of it. Copying the whole
 * thing into this repo would mean maintaining eleven service pages' worth of
 * marketing copy in a codebase that renders none of it.
 *
 * So: four fields, same order (brief §3 menu order, spearhead first), same
 * navLine strings verbatim. If a service is renamed, re-slugged, or reordered
 * over there, re-sync this file — nothing detects the drift automatically.
 *
 * navLine has a ≤35-character budget (the dropdown renders it at 13px in a
 * 246px column and truncates rather than wraps). Do not exceed it here either. */

export type NavService = {
  slug: string;
  name: string;
  navLine: string;
  /** The flagship discipline. Note the "Start here" badge belongs to the Lead
   *  Engine featured row, NOT to this item — see components/Header.tsx. */
  spearhead?: boolean;
};

export const services: NavService[] = [
  {
    slug: "ai-automation",
    name: "AI Automation & Chatbots",
    navLine: "Assistants that answer and book.",
    spearhead: true,
  },
  {
    slug: "ai-integration",
    name: "AI Integration",
    navLine: "AI wired into the tools you run.",
  },
  {
    slug: "business-process-automation",
    name: "Business Process Automation",
    navLine: "The manual steps, automated.",
  },
  {
    slug: "web-apps-saas",
    name: "Custom Web Apps & SaaS",
    navLine: "Portals, dashboards, booking tools.",
  },
  {
    slug: "web-app-development",
    name: "Web & App Development",
    navLine: "Fast sites and apps, no overhead.",
  },
  {
    slug: "conversion-websites",
    name: "Conversion Websites",
    navLine: "Measured by enquiries, not praise.",
  },
  {
    slug: "landing-pages-ad-campaigns",
    name: "Landing Pages & Ad Campaigns",
    navLine: "One page, one offer, paid traffic.",
  },
  {
    slug: "seo-local-lead-gen",
    name: "SEO & Local Visibility",
    navLine: "Show up where customers search.",
  },
  {
    slug: "brand-design-systems",
    name: "Brand & Design Systems",
    navLine: "One visual system, used everywhere.",
  },
  {
    slug: "ecommerce",
    name: "E-commerce",
    navLine: "Stores where buying is easy.",
  },
  {
    slug: "technical-consulting",
    name: "Technical Consulting",
    navLine: "A second opinion before you commit.",
  },
];

export function getService(slug: string): NavService | undefined {
  return services.find((s) => s.slug === slug);
}
