/* URL constants for a repo that is served under a basePath.
 *
 * PORTED FROM E:\debugswift-blog\lib\links.ts, which learned all of this the
 * hard way. Same three traps, same shape, "/tools" instead of "/blog".
 *
 * Two different kinds of "internal" exist here and confusing them is how this
 * app breaks:
 *
 *   MAIN-SITE paths  — /services, /about, /contact … live in the OTHER repo
 *                      (E:\debugswift). They must be plain <a> hrefs, because
 *                      next/link would prefix basePath and send them to
 *                      /tools/services, which does not exist.
 *   TOOL paths       — the routes in this repo. Written WITHOUT the /tools
 *                      prefix and passed to next/link, which adds it.
 *
 * Anything that has to be an absolute URL (canonicals, JSON-LD, sitemaps, OG
 * images) uses the helpers below rather than hand-built strings — Next does not
 * apply basePath to metadata, so hand-built ones silently lose the /tools
 * segment. */

export const SITE_URL = "https://debugswift.com";

/** The basePath, duplicated from next.config.ts on purpose: metadata routes
 *  need it as a value and cannot read the config. */
export const TOOLS_BASE = "/tools";

/** Absolute URL for a TOOL route. Pass the path as next/link sees it ("/",
 *  "/website-audit"), not with /tools already on the front. */
export function toolUrl(path = "/"): string {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${TOOLS_BASE}${clean}`;
}

/** Absolute URL for a MAIN-SITE page ("/services/ai-automation"). */
export function siteUrl(path = "/"): string {
  return `${SITE_URL}${path === "/" ? "" : path}`;
}

/**
 * A file in /public, as next/image needs to see it.
 *
 * THIRD basePath trap, and the one that breaks silently in production only.
 * next/image turns a local src into `/tools/_next/image?url=%2Fphotos%2Fx.webp`.
 * The route carries the basePath but the `url` parameter does NOT, and the
 * optimizer resolves that parameter by fetching it from its own server — where
 * `/photos/x.webp` is a 404, because everything this deployment serves lives
 * under /tools. The optimizer then answers 400 "The requested resource isn't a
 * valid image" and every local image on the site is broken.
 *
 * So local paths get the prefix here, at the point they meet next/image.
 *
 * Safe to wrap anything: remote URLs and already-prefixed paths pass through
 * untouched.
 */
export function publicAsset(src: string): string {
  if (/^https?:\/\//.test(src) || src.startsWith("data:")) return src;
  if (src === TOOLS_BASE || src.startsWith(`${TOOLS_BASE}/`)) return src;
  return `${TOOLS_BASE}${src.startsWith("/") ? src : `/${src}`}`;
}

/** Canonical path for page metadata. Next resolves `alternates.canonical`
 *  against metadataBase and does NOT add basePath, so this must carry it. */
export function canonicalPath(path = "/"): string {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `${TOOLS_BASE}${clean}` || "/";
}

/* Main-site destinations referenced from tool chrome and result CTAs. Kept in
 * one place so a route rename on the main site is a one-file fix here. */
export const MAIN = {
  home: "/",
  services: "/services",
  about: "/about",
  contact: "/contact",
  diagnosis: "/contact#diagnosis",
  leadEngine: "/lead-engine",
  /* The blog is its OWN deployment (E:\debugswift-blog), proxied at /blog.
   * From here it is just another main-domain path — a bare <a>, never
   * next/link, exactly like /services. */
  blog: "/blog",
  privacy: "/privacy",
  terms: "/terms",
  sitemap: "/sitemap",
  service: (slug: string) => `/services/${slug}`,
} as const;

/* Client-side fetch targets.
 *
 * These carry the /tools prefix explicitly, and must. basePath is applied by
 * next/link and the router; fetch() is a browser API that knows nothing about
 * Next, so fetch("/api/audit") from a page served at /tools/website-audit hits
 * debugswift.com/api/audit — the MAIN site, which has no such route. */
export const API = {
  audit: `${TOOLS_BASE}/api/audit`,
  /* The deeper checks — Google, Mozilla, the domain registry. Separate route
   * because it is slow and sends the address to third parties; see the header
   * of lib/audit/deep.ts. */
  deep: `${TOOLS_BASE}/api/deep`,
} as const;

/* Tool destinations, as next/link wants them (no /tools prefix). */
export const TOOLS = {
  home: "/",
  tool: (slug: string) => `/${slug}`,
} as const;
