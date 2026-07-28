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

  async redirects() {
    return [
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
