import type { ReactNode } from "react";

/* §3: flat Paper or Cream, 1.5px solid Ink border, 14px radius.
 * No drop shadows, ever — Deb supplies all the dimensionality this brand needs. */
export default function Card({
  surface = "paper",
  children,
  className,
}: {
  surface?: "paper" | "cream";
  children: ReactNode;
  className?: string;
}) {
  const base = `rounded-card border-[1.5px] border-ink p-6 ${
    surface === "paper" ? "bg-paper" : "bg-cream"
  }`;
  return <div className={className ? `${base} ${className}` : base}>{children}</div>;
}
