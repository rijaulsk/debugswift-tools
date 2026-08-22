"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
/* STATIC IMPORT, not a "/brand/..." string, and this is a basePath bug fix.
 *
 * next/image sends raster images through /_next/image, and that optimizer URL
 * correctly picks up the basePath. SVG bypasses the optimizer entirely and the
 * raw src is emitted verbatim — so src="/brand/debugswift-icon-color.svg"
 * shipped WITHOUT the basePath prefix and resolved to the main site's path,
 * which has no such file. The mark 404'd and the header rendered as bare
 * "DebugSwift" text with a hole where the logo should be.
 *
 * A static import is bundled to /tools/_next/static/media/..., which carries
 * the prefix. Any other SVG rendered through next/image in this repo must be
 * imported the same way. */
import brandMark from "@/public/brand/debugswift-icon-color.svg";
import { variantClasses } from "@/components/Button";
import MainSiteLink from "@/components/MainSiteLink";
import { MAIN, TOOLS } from "@/lib/links";
import { services } from "@/lib/nav";

/* PORTED FROM E:\debugswift\components\Header.tsx via E:\debugswift-blog —
 * identical markup and styling, with exactly one structural change for this
 * repo:
 *
 *   Every destination that lives on the MAIN site is a <MainSiteLink> (a bare
 *   <a>), because this app runs under basePath "/tools" and next/link would
 *   turn href="/services" into /tools/services. Only the Tools entry uses
 *   next/link, pointing at "/" — basePath renders that as /tools, which is this
 *   app's index.
 *
 * That asymmetry looks wrong at a glance and is correct: "/" through next/link
 * means the tools index; "/" through MainSiteLink means debugswift.com. Read
 * the component name, not the path.
 *
 * NOTE the inversion against the blog repo: there, Blog was the next/link entry
 * and Tools was a main-site link. Here it is the other way round. Both are
 * separate deployments proxied onto one domain, and each one's own section is
 * the only local route it has.
 *
 * The Tools entry also carries an active marker here, which the main site's
 * header has for nothing — in this deployment the visitor is always inside
 * Tools, and the nav should say so. It is a static flag, not derived from
 * usePathname: usePathname strips the basePath, so on /tools it returns "/" and
 * any path-matching rule would light up Home instead. */

type NavLink = { label: string; href: string; main: boolean };

const primaryLinks: NavLink[] = [
  { label: "About", href: MAIN.about, main: true },
  { label: "Blog", href: MAIN.blog, main: true },
  /* This repo IS the tools app. Tools → next/link "/" → renders /tools. */
  { label: "Tools", href: TOOLS.home, main: false },
  { label: "Contact", href: MAIN.contact, main: true },
];

/* Home · Services (dropdown) · About · Blog · Tools · Contact + a "Book a free
 * diagnosis" pill — SECONDARY (1.5px ink border), not clay: the header is
 * sticky, so a clay pill here would ride over every page's own primary CTA and
 * blow the ≤2%-per-viewport clay ration. The mobile menu's pill IS clay, which
 * is fine — that panel is full-screen, so it's the only clay in the view.
 * The dropdown holds 12 rows: the Lead Engine featured row + all 11 services.
 * The Lead Engine is a flagship fix, not a peer of the whole agency, so it
 * lives inside Services — as the panel's featured row, carrying the "Start
 * here" badge — not the top-level nav. The badge renders on that row only,
 * never also on the AI Automation grid item.
 * Sticky solid cream — no blur/transparency (glassmorphism stays banned). */
export default function Header() {
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  /* Close everything on navigation — state adjusted during render, per
   * react.dev "You might not need an effect". Still correct under basePath:
   * usePathname returns the path with /tools stripped, which is fine here
   * because all we need is a value that CHANGES between tool routes. */
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setServicesOpen(false);
    setMobileOpen(false);
  }

  /* Escape closes; click outside closes the dropdown. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setServicesOpen(false);
        setMobileOpen(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setServicesOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);

  /* Lock body scroll behind the mobile panel. */
  useEffect(() => {
    document.documentElement.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [mobileOpen]);

  const linkBase = "transition-colors duration-200 ease-out";
  const linkClass = `${linkBase} text-ink hover:text-indigo-600`;
  /* Active = Indigo 600 + a 1.5px underline offset clear of the text. No new
   * colour, no new weight — the token table covers this.
   *
   * THIS IS A COMPLETE CLASS, NOT A MODIFIER, and must never be concatenated
   * onto linkClass again. It was, and the two both set a text colour at the
   * same specificity: Tailwind emits text-ink after text-indigo-600, so the
   * active colour lost silently and the current section rendered as plain ink
   * with a stray underline — which reads as a link stuck in its hover state
   * rather than as "you are here". It also left Tools as the one nav item
   * whose hover behaved differently from Services, because ink→indigo on an
   * item that was supposed to already BE indigo is not a hover, it is a
   * correction. Active now hovers to Indigo 700, so every item in the bar
   * responds to the pointer the same way. */
  const activeClass = `${linkBase} text-indigo-600 underline decoration-[1.5px] underline-offset-[6px] hover:text-indigo-700`;

  return (
    /* TOOLS DIFFERENCE: print:hidden. This app produces a document people
     * actually print (the quote generator), and site chrome on a client-facing
     * invoice looks like a mistake. The marketing and blog repos have nothing
     * printable and don't carry this. */
    <header className="sticky top-0 z-40 border-b border-mist bg-cream print:hidden">
      <div className="mx-auto flex w-full max-w-canvas items-center justify-between gap-8 px-6 py-4 md:px-12">
        {/* Lockup composed in HTML: debugswift.svg has live <text> nodes that
         * <img> can't render in Satoshi, so the wordmark is real text here.
         * Points at the main site's home, not the blog index. */}
        <MainSiteLink
          href={MAIN.home}
          aria-label="DebugSwift home"
          className="flex shrink-0 items-center gap-2"
        >
          <Image src={brandMark} alt="" width={24} height={32} priority />
          <span className="text-[20px] font-bold text-indigo-500">
            DebugSwift
          </span>
        </MainSiteLink>

        {/* Desktop nav */}
        <div ref={navRef} className="hidden items-center gap-7 lg:flex">
          <nav className="flex items-center gap-7 text-small font-medium">
            <MainSiteLink href={MAIN.home} className={linkClass}>
              Home
            </MainSiteLink>
            <div
              className="relative"
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => setServicesOpen(false)}
            >
              {/* "Services" is a link with a separate disclosure control for the
               * panel — /services is itself an ad destination and must be
               * reachable without opening a dropdown first. */}
              <span className="flex items-center gap-1.5">
                <MainSiteLink href={MAIN.services} className={linkClass}>
                  Services
                </MainSiteLink>
                {/* h-6 w-6: a bare caret is a ~10px tap target and fails WCAG
                 * target-size (2.5.8). The box is invisible; the hit area isn't. */}
                <button
                  type="button"
                  aria-expanded={servicesOpen}
                  aria-label="Show all services"
                  onClick={() => setServicesOpen((v) => !v)}
                  className="-mr-1 flex h-6 w-6 items-center justify-center text-ink transition-colors duration-200 ease-out hover:text-indigo-600"
                >
                  <span
                    aria-hidden="true"
                    className={`text-[10px] transition-transform duration-[250ms] ease-out ${
                      servicesOpen ? "rotate-180" : ""
                    }`}
                  >
                    ▾
                  </span>
                </button>
              </span>
              {/* Panel stays mounted so crawlers index all 12 links (the Lead
                * Engine featured row + 11 services). */}
              <div
                className={`absolute left-1/2 top-full w-[620px] -translate-x-1/2 pt-4 transition-[opacity,translate] duration-[250ms] ease-out ${
                  servicesOpen
                    ? "visible translate-y-0 opacity-100"
                    : "invisible translate-y-1 opacity-0"
                }`}
              >
                {/* max-h: the panel hangs from a STICKY header, so anything it
                 * can't fit is unreachable. Capped to the space below the header
                 * (73px bar + 16px pt-4 + breathing room) with internal scroll as
                 * the last resort on very short viewports. */}
                <div className="max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-card border-[1.5px] border-ink bg-paper p-6">
                  {/* Featured row — the product, above the service menu it
                   * belongs to. Full width so it reads as a tier of its own
                   * rather than a thirteenth service. */}
                  <MainSiteLink
                    href={MAIN.leadEngine}
                    className="group mb-3 block rounded-lg border-b-[1.5px] border-mist px-3 pb-3 pt-2 transition-colors duration-200 ease-out hover:bg-indigo-50"
                  >
                    <span className="font-bold text-ink group-hover:text-indigo-700">
                      The Lead Engine
                      <span className="ml-2 whitespace-nowrap rounded-full bg-clay-100 px-2 py-0.5 text-eyebrow uppercase text-clay-900">
                        Start here
                      </span>
                    </span>
                    <span className="mt-0.5 block text-small text-slate">
                      One channel, one leak, patched in 7 days.
                    </span>
                  </MainSiteLink>
                  {/* navLine, NOT oneLiner — see lib/nav.ts for the character
                   * budget. Two spacing rules do the grouping and must stay in
                   * this relationship: the gap BETWEEN rows (py-2 both sides +
                   * gap-y-1 = 20px) must dwarf the gap WITHIN a row (mt-1 = 4px).
                   * The description also steps DOWN a size, borrowing the eyebrow
                   * step's 13px/16px while cancelling that token's bundled weight
                   * and tracking, which belong to the uppercase treatment. */}
                  <ul className="grid grid-cols-2 gap-x-8 gap-y-1">
                    {services.map(({ slug, name, navLine }) => (
                      <li key={slug}>
                        <MainSiteLink
                          href={MAIN.service(slug)}
                          className="group block rounded-lg px-3 py-2 transition-colors duration-200 ease-out hover:bg-indigo-50"
                        >
                          <span className="font-medium text-ink group-hover:text-indigo-700">
                            {name}
                          </span>
                          <span className="mt-1 block truncate text-eyebrow font-normal tracking-normal text-slate">
                            {navLine}
                          </span>
                        </MainSiteLink>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 border-t-[1.5px] border-mist pt-3">
                    <MainSiteLink
                      href={MAIN.services}
                      className="px-3 font-medium text-indigo-600 transition-colors duration-200 ease-out hover:text-indigo-700"
                    >
                      All services →
                    </MainSiteLink>
                  </div>
                </div>
              </div>
            </div>
            {primaryLinks.map(({ label, href, main }) =>
              main ? (
                <MainSiteLink key={label} href={href} className={linkClass}>
                  {label}
                </MainSiteLink>
              ) : (
                <Link
                  key={label}
                  href={href}
                  aria-current="page"
                  className={activeClass}
                >
                  {label}
                </Link>
              ),
            )}
          </nav>
          {/* Secondary pill, NOT clay: the header is sticky, so a clay pill
           * here would put two clay elements in every view (ration is one). */}
          <MainSiteLink
            href={MAIN.contact}
            className="inline-flex items-center justify-center rounded-full border-[1.5px] border-ink px-5 py-2.5 text-small font-medium text-ink transition duration-200 ease-out hover:bg-sand active:scale-[0.98] active:bg-mist"
          >
            Book a free diagnosis
          </MainSiteLink>
        </div>

        {/* Mobile toggle — three swept strokes echoing the swift's crescent
         * wing (the logo's silhouette): each line banks down-right like a wing
         * feather, longest on top, the middle one indigo. On open the three
         * curves MORPH into a cross and sweep back into the wing on close: each
         * path's `d` transitions between its wing curve and a straight X leg
         * (see .menu-stroke in globals.css), the indigo middle stroke
         * collapsing to the centre point and fading so a clean two-leg X
         * remains. The reduced-motion guard snaps the swap instantly. */}
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((v) => !v)}
          className="relative flex h-10 w-10 items-center justify-center lg:hidden"
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 26 26"
            fill="none"
            aria-hidden="true"
          >
            <path
              className="menu-stroke"
              d={
                mobileOpen
                  ? "M6 6 C 10.67 10.67, 15.33 15.33, 20 20"
                  : "M3 7.5 C 9 4.5, 17 5, 23 9"
              }
              stroke="var(--color-ink)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              className="menu-stroke"
              style={{ opacity: mobileOpen ? 0 : 1 }}
              d={
                mobileOpen
                  ? "M13 13 C 13 13, 13 13, 13 13"
                  : "M3 13.5 C 7.5 11, 13 11.5, 17 14"
              }
              stroke="var(--color-indigo-500)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              className="menu-stroke"
              d={
                mobileOpen
                  ? "M20 6 C 15.33 10.67, 10.67 15.33, 6 20"
                  : "M3 19.5 C 6.5 17.5, 10 18, 12.5 19.5"
              }
              stroke="var(--color-ink)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Mobile panel — the whole section slides in rather than fading in place.
       * An outer fixed wrapper starts just below the header (top-73) and CLIPS
       * (overflow-hidden); the inner panel translates within it, so it unfurls
       * from the header edge and can never cover the sticky bar or push past the
       * right edge into a phantom horizontal scrollbar. 280ms panel motion per
       * §4; the reduced-motion guard collapses it.
       *
       * The inner panel stays mounted and visible-capable in BOTH states so its
       * transform/opacity transition plays on close as well as open. Closed, the
       * panel is translated out of view and clipped; `inert` +
       * `pointer-events-none` keep it out of tab order, AT, and the click layer
       * so the invisible overlay never eats taps. */}
      <div
        className={`fixed inset-x-0 bottom-0 top-[73px] z-40 overflow-hidden lg:hidden ${
          mobileOpen ? "" : "pointer-events-none"
        }`}
        inert={!mobileOpen || undefined}
      >
        <div
          className={`h-full overflow-y-auto bg-cream transition-[transform,opacity] duration-[280ms] ease-out ${
            mobileOpen
              ? "translate-y-0 opacity-100"
              : "-translate-y-full opacity-0"
          }`}
        >
        {/* Centred on mobile per the site-wide mobile convention (owner's call,
         * 22 Jul) — desktop nav stays left-anchored above. */}
        <nav className="mx-auto w-full max-w-canvas px-6 py-8 text-center">
          <ul className="space-y-1 text-h3 font-medium">
            <li>
              <MainSiteLink href={MAIN.home} className={`block py-2 ${linkClass}`}>
                Home
              </MainSiteLink>
            </li>
            <li>
              <MainSiteLink href={MAIN.about} className={`block py-2 ${linkClass}`}>
                About
              </MainSiteLink>
            </li>
            <li>
              <MainSiteLink href={MAIN.blog} className={`block py-2 ${linkClass}`}>
                Blog
              </MainSiteLink>
            </li>
            <li>
              <Link
                href={TOOLS.home}
                aria-current="page"
                className={`block py-2 ${activeClass}`}
              >
                Tools
              </Link>
            </li>
            <li>
              <MainSiteLink href={MAIN.contact} className={`block py-2 ${linkClass}`}>
                Contact
              </MainSiteLink>
            </li>
          </ul>
          <p className="mt-8 text-eyebrow uppercase text-indigo-600">
            Services
          </p>
          {/* Featured entry — mirrors the desktop panel's Lead Engine row so
           * the product is one tap from any page on a phone too. */}
          <MainSiteLink
            href={MAIN.leadEngine}
            className="mt-3 flex items-center justify-center gap-2 py-2 font-medium text-ink transition-colors duration-200 ease-out hover:text-indigo-600"
          >
            The Lead Engine
            <span className="whitespace-nowrap rounded-full bg-clay-100 px-2 py-0.5 text-eyebrow uppercase text-clay-900">
              Start here
            </span>
          </MainSiteLink>
          <ul className="mt-1 space-y-1">
            {services.map(({ slug, name }) => (
              <li key={slug}>
                <MainSiteLink
                  href={MAIN.service(slug)}
                  className={`block py-1.5 ${linkClass}`}
                >
                  {name}
                </MainSiteLink>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            {/* Shares the primary-pill styling (press-scale + hover) so the
             * CTA behaves identically everywhere — the site-wide standard. */}
            <MainSiteLink href={MAIN.contact} className={variantClasses.primary}>
              Book a free diagnosis
            </MainSiteLink>
          </div>
        </nav>
        </div>
      </div>
    </header>
  );
}
