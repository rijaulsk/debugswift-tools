import type { NextConfig } from "next";

/* This app is served at debugswift.com/tools through a reverse proxy from the
 * MAIN repo (E:\debugswift), whose next.config.ts holds a `beforeFiles` rewrite
 * for /tools and /tools/:path* that activates when TOOLS_ORIGIN is set.
 *
 * basePath is therefore NOT optional. Every page, every /_next/* asset, and
 * every metadata route has to live under /tools or the proxied URLs and the
 * asset paths disagree and the site loads naked HTML.
 *
 * The cost of basePath, and the single most likely defect in this repo:
 * next/link silently prefixes /tools onto every href. The Header and Footer link
 * to pages that live in the MAIN app (/services, /about, /contact …), and as
 * <Link> those become /tools/services and 404. See components/MainSiteLink.tsx —
 * main-site links are bare <a>, next/link is for tool routes only.
 *
 * Third trap, the one that only breaks in production: fetch() knows nothing
 * about basePath. Client-side calls to the audit API must use lib/links.ts's
 * API constant, which carries the prefix explicitly. */

const nextConfig: NextConfig = {
  basePath: "/tools",

  /* Same reasoning as the main repo: one ~38KB stylesheet was blocking first
   * paint, and inlining it removes the round trip. It matters more here than
   * there — arriving at /tools is almost always a HARD navigation out of
   * another deployment, so there is no warm client router to hide the wait
   * behind. Measured on the main app: raw HTML roughly doubles, brotli grows
   * by about a kilobyte, because the duplication is repeated text. Judge any
   * future change on the BROTLI figure, never the raw one. */
  experimental: {
    inlineCss: true,
  },

  async redirects() {
    return [
      /* Satoshi is loaded from the absolute path /fonts/Satoshi-Variable.woff2
       * so that this app, the blog and the main site share ONE cache entry
       * instead of fetching the same 41.6KB file under three prefixes. See the
       * note at the top of app/globals.css.
       *
       * In production that path is served by the MAIN deployment: only /tools
       * and /blog are proxied, so /fonts/* never reaches this app and this rule
       * is dead code there. It exists for standalone dev and the raw Vercel
       * origin, where basePath puts this repo's own copy at /tools/fonts/… and
       * a request to /fonts/… would 404.
       *
       * A redirect rather than a rewrite because Next refuses to rewrite from
       * outside the basePath to inside it ("rewrites urls outside of the
       * basePath"). The extra hop costs one 307 on one file, and only ever in
       * dev. Temporary, for the same reason as the root rule below: this is not
       * a canonical URL and a 308 would outlive any change to the setup. */
      {
        source: "/fonts/:path*",
        destination: "/tools/fonts/:path*",
        permanent: false,
        basePath: false as const,
      },

      /* The root of THIS deployment.
       *
       * basePath means this app serves nothing at "/", so hitting the origin
       * root produced a 404 — confusing in local dev (localhost:3000 looks
       * broken until you remember to type /tools) and wrong on the raw Vercel
       * origin, which has no reason to be a dead end.
       *
       * In production nobody reaches this: debugswift.com/ is the main site and
       * only /tools/* is proxied here. So it costs nothing and fixes both of the
       * places it does show up.
       *
       * basePath:false is required — without it Next would prefix the source
       * and this would mean /tools -> /tools/tools. Temporary rather than
       * permanent: the origin root is not a canonical URL and a 308 would sit
       * in browser caches long after any change to this setup. */
      {
        source: "/",
        destination: "/tools",
        permanent: false,
        basePath: false as const,
      },
    ];
  },
};

export default nextConfig;
