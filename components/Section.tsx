import type { ReactNode } from "react";
import CircuitPattern from "@/components/CircuitPattern";
import Eyebrow from "@/components/Eyebrow";

type Band = "cream" | "sand" | "paper" | "dark";

const bandClasses: Record<Band, string> = {
  cream: "bg-cream",
  sand: "bg-sand",
  paper: "bg-paper",
  /* v2 §3: max ONE dark band per page (footer counts unless stated). */
  dark: "bg-indigo-900",
};

/* v2 §1: full-bleed band + 1320px inner canvas + asymmetric section padding.
 * Every section on the site goes through this shell. */
export function Section({
  band = "cream",
  id,
  className,
  innerClassName,
  pattern = false,
  children,
}: {
  band?: Band;
  id?: string;
  className?: string;
  innerClassName?: string;
  /* §3 circuit motif full-bleed behind the band (≤8%). Off by default —
   * this stays a rationed accent, not every section's wallpaper. */
  pattern?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`relative${pattern ? " overflow-hidden" : ""} ${bandClasses[band]}${className ? ` ${className}` : ""}`}
    >
      {pattern && <CircuitPattern opacity={0.08} id="circuit-section" />}
      <div
        className={`relative mx-auto w-full max-w-canvas px-6 pt-16 pb-14 md:px-12 md:pt-32 md:pb-24${
          innerClassName ? ` ${innerClassName}` : ""
        }`}
      >
        {children}
      </div>
    </section>
  );
}

/* Eyebrow + title (+ optional lede) — the mandatory header of every section.
 * align "center-mobile" centres the header below lg only; desktop stays
 * left-anchored per §9. This is now the SITE-WIDE default (owner's call, 22 Jul
 * 2026: centre everything on mobile — it reads better on a phone). Pass
 * align="left" for the rare header that must stay left-anchored even on mobile. */
export function SectionHeader({
  eyebrow,
  title,
  lede,
  dark = false,
  as: Heading = "h2",
  align = "center-mobile",
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  dark?: boolean;
  as?: "h1" | "h2" | "h3";
  align?: "left" | "center-mobile";
  className?: string;
}) {
  const centerMobile = align === "center-mobile";
  const centerText = centerMobile ? " text-center lg:text-left" : "";
  const centerBlock = centerMobile ? " mx-auto lg:mx-0" : "";
  return (
    <div className={`${centerText.trim()}${className ? ` ${className}` : ""}`}>
      <Eyebrow className={dark ? "text-indigo-400" : undefined}>
        {eyebrow}
      </Eyebrow>
      <Heading
        className={`mt-3 max-w-4xl text-h2${centerBlock} ${dark ? "text-cream" : "text-ink"}`}
      >
        {title}
      </Heading>
      {lede && (
        <p className={`mt-5 max-w-2xl${centerBlock} ${dark ? "text-mist" : "text-slate"}`}>
          {lede}
        </p>
      )}
    </div>
  );
}
