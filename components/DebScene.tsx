import CircuitPattern from "@/components/CircuitPattern";
import Deb from "@/components/Deb";

/* Deb, staged — never plain (owner rule: outside the homepage hero, a bare
 * mascot render "looks really plain"). The scene gives her context the same
 * way the homepage does: the faint circuit field behind her (background layer,
 * never on the bird) and a chat speech bubble in the ChatDemo's own visual
 * language — because talking is literally what the product does.
 *
 * The bubble is Deb SPEAKING, so it uses the incoming-message style (paper,
 * sharp corner toward her) with the same clipped-square tail as ChatDemo. */

export default function DebScene({
  pose,
  line,
  width = 320,
  className,
}: {
  pose: "hero" | "thinking" | "celebrate";
  /** What Deb says. Keep it under ~30 chars — it's a chat bubble, not a lede. */
  line: string;
  width?: number;
  className?: string;
}) {
  return (
    <div className={`relative${className ? ` ${className}` : ""}`}>
      <CircuitPattern opacity={0.07} className="-inset-6 h-auto w-auto" />
      <div className="relative flex flex-col items-center">
        <div className="relative -mb-2 mr-[38%] self-center">
          <p className="rounded-card rounded-br-[4px] border-[1.5px] border-ink bg-paper px-4 py-2 text-small text-ink">
            {line}
          </p>
          {/* tail: a rotated square whose lower-right half pokes out below the
           * bubble — clip-path would cut the border, this keeps it. */}
          <span
            aria-hidden="true"
            className="absolute -bottom-[7px] right-4 h-3 w-3 rotate-45 border-r-[1.5px] border-b-[1.5px] border-ink bg-paper"
          />
        </div>
        <Deb
          pose={pose}
          width={width}
          float
          sizes={`(max-width: 1024px) ${Math.round(width * 0.62)}px, ${width}px`}
          className="relative"
        />
      </div>
    </div>
  );
}
