/* Speculation rules for the links next/link cannot help with.
 *
 * Everything outside /tools lives in a DIFFERENT Next deployment, reached the
 * other way through the main app's beforeFiles rewrites. The client router
 * cannot navigate there — there is no shared RSC graph — so every Header and
 * Footer link to /services, /about, /contact or /blog is a full document load.
 * That is also why those links are bare <a> through MainSiteLink rather than
 * next/link: see components/MainSiteLink.tsx.
 *
 * This hands the browser the destination document on hover, which is the part
 * of the hop that nothing else covers.
 *
 * PREFETCH, DELIBERATELY, NOT PRERENDER. Prerender would run the destination's
 * JavaScript in the background and make the click feel instant — but
 * @vercel/analytics has no `document.prerendering` guard, so it would count a
 * pageview for every page merely hovered over, in an estate whose one
 * analytics signal is worth more than the extra couple of hundred
 * milliseconds.
 *
 * `moderate` fires on hover rather than on load. Browsers without speculation
 * rules ignore the script; nothing here is load-bearing.
 *
 * The rule is written as an exclusion rather than a list of destinations
 * because the Header links to all eleven service pages, and a list would be a
 * twelfth copy of lib/nav.ts to keep in sync. */
const rules = {
  prefetch: [
    {
      where: {
        and: [
          { href_matches: "/*" },
          { not: { href_matches: "/tools" } },
          { not: { href_matches: "/tools/*" } },
        ],
      },
      eagerness: "moderate",
    },
  ],
};

export default function CrossAppPrefetch() {
  return (
    <script
      type="speculationrules"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(rules) }}
    />
  );
}
