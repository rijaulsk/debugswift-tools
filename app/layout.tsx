import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import localFont from "next/font/local";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import StickyMobileBar from "@/components/StickyMobileBar";
import { canonicalPath, SITE_URL, toolUrl } from "@/lib/links";
import { jsonLdScript } from "@/lib/seo";
import { CONTACT_EMAIL, SOCIALS } from "@/lib/site";
import "./globals.css";

/* Entity continuity across three deployments.
 *
 * A crawler fetching debugswift.com/tools/<tool> receives THIS app's HTML, not
 * the main site's — so the Organization graph declared in E:\debugswift's
 * app/layout.tsx is simply absent from the document. Referencing its @id from
 * here without defining the node would leave a dangling reference on every tool
 * page.
 *
 * So this app re-declares a compact Organization under the SAME @id
 * (https://debugswift.com/#org). Same identifier, same name, same logo, same
 * sameAs list — consistent, never contradictory. Search engines and LLMs
 * reconcile them into one entity instead of inventing three companies. The blog
 * repo does exactly this too; keep all three in step.
 *
 * No SearchAction on the WebSite node here. The blog declares one because it has
 * a search surface; this app has none, and advertising a search endpoint that
 * doesn't exist is the kind of markup that gets ignored at best. */
const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "DebugSwift",
      url: SITE_URL,
      logo: `${SITE_URL}/brand/debugswift-icon-color.svg`,
      email: CONTACT_EMAIL,
      sameAs: SOCIALS.map((s) => s.href),
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "DebugSwift",
      publisher: { "@id": `${SITE_URL}/#org` },
      inLanguage: "en",
    },
  ],
};

/* Satoshi only — Inter is banned (design system §2). Variable woff2, 300–900.
 * Copied from E:\debugswift\public\fonts: /public is served by THIS deployment,
 * so the font cannot be borrowed from the main app across the proxy. */
const satoshi = localFont({
  src: [
    {
      path: "../public/fonts/Satoshi-Variable.woff2",
      weight: "300 900",
      style: "normal",
    },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

export const metadata: Metadata = {
  /* The canonical host is the MAIN domain, never the *.vercel.app origin this
   * app is actually deployed to. Without this every canonical, OG url and
   * JSON-LD id would advertise the proxy origin and split the site in two. */
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Free Tools — DebugSwift",
    /* Matches the main site's template so a tab from any deployment reads the
     * same way. */
    template: "%s — DebugSwift",
  },
  description:
    "Free, no-signup tools for small businesses — audits, generators and calculators that give you a straight answer without asking for an email first.",
  /* The MAIN site's manifest, at the domain root. This repo deliberately ships
   * no manifest.ts: one domain gets one web app manifest, and a second one at
   * /tools/manifest.webmanifest would give the same site two different names and
   * icon sets depending on which page it was added to the home screen from.
   * Metadata URLs skip basePath, so this resolves to debugswift.com/... */
  manifest: "/manifest.webmanifest",
  alternates: { canonical: canonicalPath("/") },
  openGraph: {
    type: "website",
    siteName: "DebugSwift",
    url: toolUrl("/"),
    images: [
      {
        /* Absolute, and pointing at THIS deployment's copy (public/og.png is
         * served at /tools/og.png under basePath). Next does not apply basePath
         * to metadata URLs, so a relative "/og.png" would silently resolve to
         * the main site's file instead. */
        url: toolUrl("/og.png"),
        width: 1200,
        height: 630,
        alt: "DebugSwift — Debugging businesses swiftly.",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${satoshi.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans" suppressHydrationWarning>
        <script
          type="application/ld+json"
          /* jsonLdScript, not bare JSON.stringify: it escapes "<" so a value
           * containing "</script>" cannot close the tag early. This payload is
           * static today, but the helper exists for exactly this and every
           * other JSON-LD block in the app already goes through it. */
          dangerouslySetInnerHTML={{ __html: jsonLdScript(siteJsonLd) }}
        />
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
        <StickyMobileBar />
        {/* Separate deployment = separate Analytics mount. The main site's
         * instance does not cover pages served from this origin. */}
        <Analytics />
      </body>
    </html>
  );
}
