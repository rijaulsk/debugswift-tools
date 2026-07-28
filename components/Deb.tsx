import Image from "next/image";
import { publicAsset } from "@/lib/links";

/* Deb — the mascot, in one place.
 *
 * Placement kept drifting (she was landing on top of the chat demo, covering
 * the phone header and the first message), so the slot rules now live in code
 * rather than in a doc nobody re-reads:
 *
 *   · Three poses exist. There is no fourth — brief §6: "3 static poses, ship
 *     the site, drip the rest." Do not add one here to solve a layout problem.
 *   · hero      → homepage hero only. The one `priority` render on the site.
 *   · thinking  → diagnosis contexts (contact, 404).
 *   · celebrate → proof / indigo band / post-submit.
 *   · One Deb per viewport. Never clipped. Never floating unanchored.
 *   · She may overlap a section boundary — that is the page's ONE intentional
 *     grid break, and it must be the only one.
 *   · She must never overlap readable content. Overlapping a frame edge is the
 *     effect we want; overlapping a message bubble is a bug.
 *
 * Species rule (brief §6, and it doubles as a brand rule): real swifts cannot
 * stand on flat ground. Deb flies, hovers, perches-leaning, clings. She is
 * never posed standing idle like a pigeon. */

type Pose = "hero" | "thinking" | "celebrate";

const poses: Record<Pose, { src: string; alt: string }> = {
  hero: {
    src: "/deb/deb-hero.png",
    alt: "Deb, the DebugSwift swift, banking in mid-flight",
  },
  thinking: {
    src: "/deb/deb-thinking.png",
    alt: "Deb, mid chin-scratch, thinking a diagnosis through",
  },
  celebrate: {
    src: "/deb/deb-celebrate.png",
    alt: "Deb, wings up, celebrating a shipped fix",
  },
};

export default function Deb({
  pose,
  /** Rendered width in px at the largest breakpoint. Canon range: 120–440. */
  width,
  className,
  priority = false,
  sizes,
  /** Idle hover-bob. Deb owns the motion budget, so this is where "life" comes
   * from. Disabled automatically under prefers-reduced-motion. */
  float = false,
}: {
  pose: Pose;
  width: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  float?: boolean;
}) {
  const { src, alt } = poses[pose];

  return (
    <Image
      /* /deb/*.png lives in this deployment's /public, so it needs the basePath
       * the optimizer's url parameter would otherwise drop — see publicAsset. */
      src={publicAsset(src)}
      alt={alt}
      width={width}
      height={width}
      priority={priority}
      /* Always give the browser a sizes hint — these are ~800KB PNGs and the
       * hero one is an LCP candidate. */
      sizes={sizes ?? `${width}px`}
      className={`${className ?? ""}${
        float ? " motion-safe:animate-[deb-float_6s_ease-in-out_infinite]" : ""
      }`}
    />
  );
}
