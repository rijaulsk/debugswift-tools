import Link from "next/link";
import type { ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "tertiary";

/* §3: pills (999px). Primary = Clay 500 fill + Ink text (never white on clay),
 * hover Clay 400, pressed Clay 600 — ONE per view. Secondary = transparent,
 * 1.5px Ink border. Tertiary = Indigo 600 text link, underline on hover.
 * Motion budget: 200ms ease-out, nothing more.
 * Exported so other components can wear the same clothes without forking the
 * styles — one definition, many renderers. */
export const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "inline-flex items-center justify-center rounded-full bg-clay-500 px-6 py-3 font-medium text-ink transition duration-200 ease-out hover:bg-clay-400 active:scale-[0.98] active:bg-clay-600",
  secondary:
    "inline-flex items-center justify-center rounded-full border-[1.5px] border-ink px-6 py-3 font-medium text-ink transition duration-200 ease-out hover:bg-sand active:scale-[0.98] active:bg-mist",
  /* v2 §3 contrast: tertiary links are Indigo 600 on cream/sand. */
  tertiary:
    "inline-flex items-center font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline",
};

/* PORTED FROM E:\debugswift\components\Button.tsx, with one prop added.
 *
 * In this repo a button's destination is usually a page on the MAIN site
 * (/contact#diagnosis is the closing CTA of every tool result), and this app
 * runs under basePath "/tools" — so next/link would render /tools/contact.
 * `main` therefore defaults to TRUE and produces a bare <a>.
 *
 * Pass main={false} for a destination inside this app — another tool, or the
 * hub — which is the only case where next/link is right. See
 * components/MainSiteLink.tsx for the full rule. */
export default function Button({
  variant = "primary",
  href,
  main = true,
  children,
  className,
}: {
  variant?: ButtonVariant;
  href?: string;
  /** false = a route in THIS app, routed by next/link. Default true = main site. */
  main?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const classes = className
    ? `${variantClasses[variant]} ${className}`
    : variantClasses[variant];

  if (!href) {
    return (
      <button type="button" className={classes}>
        {children}
      </button>
    );
  }

  const isAbsolute = /^(https?:|mailto:|tel:)/.test(href);
  if (isAbsolute || main) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
