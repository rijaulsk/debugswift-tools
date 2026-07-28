import type { AnchorHTMLAttributes, ReactNode } from "react";

/* A link to a page on the MAIN site (E:\debugswift) — /services, /about,
 * /contact, /lead-engine and friends. Also /blog, which is a THIRD deployment
 * (E:\debugswift-blog) and just as external from here as the main site is.
 *
 * Why this exists rather than next/link: this app runs under basePath "/tools",
 * and next/link prefixes basePath onto every href it is given. <Link href="/about">
 * renders /tools/about, which does not exist in any deployment. A bare <a> is
 * untouched by basePath, so it resolves to debugswift.com/about — correct.
 *
 * A full page load is also the honest behaviour: the main site is a separate
 * deployment with its own bundle. There is nothing to soft-navigate to.
 *
 * RULE FOR THIS REPO: main-site link → MainSiteLink. Tool route → next/link.
 * Never the other way round. */
export default function MainSiteLink({
  href,
  children,
  ...rest
}: {
  /** A main-site path, e.g. "/services/ai-automation". */
  href: string;
  children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
