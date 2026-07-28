import Link from "next/link";
import MainSiteLink from "@/components/MainSiteLink";
import { SITE_URL } from "@/lib/links";

/* Visible breadcrumbs, matching the BreadcrumbList JSON-LD exactly.
 *
 * Google's guidance is that structured-data breadcrumbs should describe a trail
 * the reader can actually see and follow — markup that describes a navigation
 * the page doesn't have is the kind of mismatch that gets rich results pulled.
 * So lib/seo.ts and this component are fed from the SAME trail array.
 *
 * The trail carries absolute URLs (the schema needs them), which is also how
 * each link decides how to render: anything under /tools is this app and uses
 * next/link; anything else is the main site and needs a bare <a>, or basePath
 * would rewrite it. */
export default function Breadcrumbs({
  trail,
}: {
  trail: { name: string; url: string }[];
}) {
  const toolsRoot = `${SITE_URL}/tools`;

  return (
    <nav aria-label="Breadcrumb" className="text-small text-stone">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {trail.map((crumb, i) => {
          const isLast = i === trail.length - 1;
          const inTools = crumb.url.startsWith(toolsRoot);
          /* next/link wants the path WITHOUT basePath; it re-adds it. */
          const toolPath = crumb.url.slice(toolsRoot.length) || "/";
          const linkClass =
            "underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-600 hover:underline";

          return (
            <li key={crumb.url} className="flex items-center gap-2">
              {isLast ? (
                <span aria-current="page" className="text-slate">
                  {crumb.name}
                </span>
              ) : inTools ? (
                <Link href={toolPath} className={linkClass}>
                  {crumb.name}
                </Link>
              ) : (
                <MainSiteLink
                  href={crumb.url.replace(SITE_URL, "") || "/"}
                  className={linkClass}
                >
                  {crumb.name}
                </MainSiteLink>
              )}
              {!isLast && <span aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
