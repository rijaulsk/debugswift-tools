import Link from "next/link";
import {
  DebugSwiftMark,
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  WhatsAppIcon,
  XIcon,
} from "@/components/icons";
import MainSiteLink from "@/components/MainSiteLink";
import { MAIN, TOOLS } from "@/lib/links";
import { services } from "@/lib/nav";
import { CONTACT_EMAIL, SOCIALS, WHATSAPP_LINK } from "@/lib/site";
import { liveTools } from "@/lib/tools";

/* PORTED FROM E:\debugswift\components\Footer.tsx via E:\debugswift-blog. Same
 * four-column grid, same Indigo 900 anchor, same copy. Two changes for this
 * repo:
 *
 *   1. Main-site destinations are <MainSiteLink> (bare <a>). basePath "/tools"
 *      would make next/link render /tools/services. See components/MainSiteLink.tsx.
 *   2. The Pages column gains an "In tools" list of the LIVE tools, because in
 *      THIS deployment the visitor is already inside the tools app. It reads
 *      from lib/tools.ts rather than a hand-written list, so shipping a tool
 *      puts it in the footer with no edit here.
 *
 * The Round 9 lesson applies to that list: a page in no menu reads as deleted.
 * Every live tool must be reachable from chrome, not only from the hub body. */

/* [label, href, isMainSite] */
const pages: [string, string, boolean][] = [
  ["Home", MAIN.home, true],
  ["Services", MAIN.services, true],
  ["About", MAIN.about, true],
  ["Contact", MAIN.contact, true],
  ["Blog", MAIN.blog, true],
  ["Tools", TOOLS.home, false],
];

const linkClass =
  "text-small text-indigo-200 underline-offset-4 transition-colors duration-200 ease-out hover:text-cream hover:underline";

/* Icon per social handle name. WhatsApp is appended so the number is never
 * printed as a number anywhere — only ever a wa.me link behind a glyph. */
const socialIcon: Record<string, (p: { size?: number }) => React.ReactNode> = {
  X: XIcon,
  LinkedIn: LinkedInIcon,
  Instagram: InstagramIcon,
  Facebook: FacebookIcon,
};

/* Footer: Indigo 900 anchor. Cream headings + mark, Mist body, Indigo 200
 * links. Centred on mobile, left-anchored from md up. Socials are icons; the
 * WhatsApp business number appears only as a link, never as digits. */
export default function Footer() {
  return (
    <footer className="bg-indigo-900">
      <div className="mx-auto w-full max-w-canvas px-6 pt-16 pb-10 text-center md:px-12 md:pt-20 md:text-left">
        <div className="grid gap-x-10 gap-y-12 md:grid-cols-[2fr_1fr_1fr_1.3fr]">
          <div>
            <div className="flex items-center justify-center gap-2 text-cream md:justify-start">
              <DebugSwiftMark width={21} height={28} />
              <span className="text-[19px] font-bold">DebugSwift</span>
            </div>
            <p className="mt-4 font-medium text-cream">
              Debugging businesses swiftly.
            </p>
            <p className="mx-auto mt-3 max-w-sm text-small text-mist md:mx-0">
              Real swifts catch bugs in flight — faster than any bird in level
              flight. So does Deb. Whatever&apos;s slowing your business down is a
              bug: we find it, fix it, and hand you the keys.
            </p>
          </div>
          <nav aria-label="Services">
            <p className="text-eyebrow uppercase text-cream">Services</p>
            <ul className="mt-4 space-y-2">
              {/* The flagship sits above the service list and wears Cream
               * rather than the Indigo 200 link colour — it's the one packaged
               * product, not a peer of the disciplines under it. */}
              <li>
                <MainSiteLink
                  href={MAIN.leadEngine}
                  className="text-small font-medium text-cream underline-offset-4 transition-colors duration-200 ease-out hover:underline"
                >
                  Lead Engine
                </MainSiteLink>
              </li>
              {services.slice(0, 5).map(({ slug, name }) => (
                <li key={slug}>
                  <MainSiteLink href={MAIN.service(slug)} className={linkClass}>
                    {name}
                  </MainSiteLink>
                </li>
              ))}
              <li>
                <MainSiteLink href={MAIN.services} className={linkClass}>
                  All services →
                </MainSiteLink>
              </li>
            </ul>
          </nav>
          <nav aria-label="Pages">
            <p className="text-eyebrow uppercase text-cream">Pages</p>
            <ul className="mt-4 space-y-2">
              {pages.map(([label, href, isMain]) => (
                <li key={label}>
                  {isMain ? (
                    <MainSiteLink href={href} className={linkClass}>
                      {label}
                    </MainSiteLink>
                  ) : (
                    <Link href={href} className={linkClass}>
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            {/* Tool-local navigation. Stacked under Pages rather than given a
             * fifth column: the grid is a four-column rhythm shared with the
             * main site, and breaking it here would make the two footers stop
             * looking like one company.
             *
             * Live tools only, and the whole block disappears when there are
             * none — an empty "In tools" heading would advertise a section that
             * isn't there. */}
            {liveTools.length > 0 && (
              <>
                <p className="mt-6 text-eyebrow uppercase text-cream">
                  In tools
                </p>
                <ul className="mt-4 space-y-2">
                  {liveTools.map(({ slug, name }) => (
                    <li key={slug}>
                      <Link href={TOOLS.tool(slug)} className={linkClass}>
                        {name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </nav>
          <div>
            <p className="text-eyebrow uppercase text-cream">Contact</p>
            <p className="mt-4 text-small text-cream">
              Kolkata, India — working worldwide.
            </p>
            <ul className="mt-2 space-y-2">
              <li>
                <a href={WHATSAPP_LINK} rel="noopener" target="_blank" className={linkClass}>
                  Message us on WhatsApp
                </a>
              </li>
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
                  {CONTACT_EMAIL}
                </a>
              </li>
            </ul>
            <ul className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
              <li>
                <a
                  href={WHATSAPP_LINK}
                  rel="noopener"
                  target="_blank"
                  aria-label="WhatsApp"
                  className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-indigo-800 text-indigo-200 transition-colors duration-200 ease-out hover:border-cream hover:text-cream"
                >
                  <WhatsAppIcon size={18} />
                </a>
              </li>
              {SOCIALS.map(({ name, href }) => {
                const Icon = socialIcon[name];
                return (
                  <li key={name}>
                    <a
                      href={href}
                      rel="noopener"
                      target="_blank"
                      aria-label={name}
                      className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-indigo-800 text-indigo-200 transition-colors duration-200 ease-out hover:border-cream hover:text-cream"
                    >
                      {Icon ? <Icon size={18} /> : name}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <div className="mt-14 flex flex-col items-center gap-4 border-t-[1.5px] border-indigo-800 pt-6 md:flex-row md:items-baseline md:justify-between">
          <p className="text-small text-mist">
            {/* Explicit {" "} — the space after the year expression gets
             * collapsed by the JSX transform otherwise ("2026DebugSwift"). */}
            Copyright &copy; {new Date().getFullYear()}
            {" DebugSwift · All rights reserved"}
          </p>
          <div className="flex flex-wrap items-baseline justify-center gap-x-6 gap-y-2">
            {/* Google Ads won't approve a destination without a reachable
             * privacy policy — these are load-bearing, not decorative. */}
            <MainSiteLink href={MAIN.privacy} className={linkClass}>
              Privacy Policy
            </MainSiteLink>
            <MainSiteLink href={MAIN.terms} className={linkClass}>
              Terms &amp; Conditions
            </MainSiteLink>
            {/* Humans get the HTML sitemap; /sitemap.xml stays for crawlers. */}
            <MainSiteLink href={MAIN.sitemap} className={linkClass}>
              Sitemap
            </MainSiteLink>
            <MainSiteLink href={MAIN.contact} className={linkClass}>
              Contact
            </MainSiteLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
