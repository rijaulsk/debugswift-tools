import type { ReactNode } from "react";

/* §2: 13/16 Medium, UPPERCASE, +6% tracking — above EVERY section title.
 * v2 §3: Indigo 600 on cream/sand (WCAG AA small text). Pass a color class
 * (e.g. text-indigo-400) for dark bands. */
export default function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  /* Only apply the default color when the caller doesn't pass one —
   * two text-* color classes in one list resolve by stylesheet order,
   * not author intent (caused an indigo-600-on-indigo-900 contrast fail). */
  const base = className?.includes("text-indigo")
    ? "text-eyebrow uppercase"
    : "text-eyebrow uppercase text-indigo-600";
  return <p className={className ? `${base} ${className}` : base}>{children}</p>;
}
