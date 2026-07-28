/* §3: faint single-weight circuit-trace pattern, Indigo 200, ≤8% opacity.
 * Section backgrounds, dividers, 404/empty states only. Never on or near Deb. */
export default function CircuitPattern({
  opacity = 0.08,
  className,
  id = "circuit",
}: {
  opacity?: number;
  className?: string;
  /* Distinguishes the <pattern> def when several instances share a page —
   * duplicate DOM ids are invalid and only render by luck today because every
   * instance is identical. Pass a unique id at each new call site. */
  id?: string;
}) {
  const base = "pointer-events-none absolute inset-0 h-full w-full text-indigo-200";
  return (
    <svg
      aria-hidden="true"
      className={className ? `${base} ${className}` : base}
      style={{ opacity }}
    >
      <defs>
        <pattern
          id={id}
          width="120"
          height="120"
          patternUnits="userSpaceOnUse"
        >
          <g fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 10h40v30h30" />
            <path d="M110 40v40h-30" />
            <path d="M10 110h30v-30" />
            <path d="M70 110V90h40" />
            <path d="M10 60h20" />
          </g>
          <g fill="currentColor">
            <circle cx="10" cy="10" r="2.5" />
            <circle cx="80" cy="40" r="2.5" />
            <circle cx="110" cy="40" r="2.5" />
            <circle cx="80" cy="80" r="2.5" />
            <circle cx="40" cy="80" r="2.5" />
            <circle cx="10" cy="60" r="2.5" />
            <circle cx="30" cy="60" r="2.5" />
            <circle cx="70" cy="110" r="2.5" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
