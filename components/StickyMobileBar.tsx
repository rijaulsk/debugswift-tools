"use client";

import { useEffect, useState } from "react";
import { WhatsAppIcon } from "@/components/icons";
import { track } from "@/lib/analytics";
import { WHATSAPP_LINK } from "@/lib/site";

/* Floating WhatsApp shortcut (mobile only).
 *
 * Replaces the old full-width bottom bar, which sat on top of the footer and
 * blocked it. This is a single compact pill in the corner that:
 *   · only appears after the hero has scrolled away (so it never doubles the
 *     hero's own CTA, keeping one clay element per view);
 *   · retracts to nothing while the footer is on screen, so it never covers the
 *     footer's links or the final form;
 *   · is a leaf action, not a bar — it obscures almost no content.
 *
 * It's a hover/press affordance, not a wall. Desktop keeps its sticky header
 * CTA, so this is md:hidden. */
export default function StickyMobileBar() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const footer = document.querySelector("footer");

    const update = () => {
      const pastHero = window.scrollY > window.innerHeight * 0.9;
      let footerVisible = false;
      if (footer) {
        const r = footer.getBoundingClientRect();
        footerVisible = r.top < window.innerHeight - 24;
      }
      setShown(pastHero && !footerVisible);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noopener"
      aria-label="Message us on WhatsApp"
      aria-hidden={!shown}
      tabIndex={shown ? 0 : -1}
      onClick={() => void track("whatsapp_click", { location: "float-fab" })}
      /* TOOLS DIFFERENCE: print:hidden — see the note in Header.tsx. */
      className={`fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full border-[1.5px] border-ink bg-cream px-4 py-3 font-medium text-ink transition-all duration-200 ease-out md:hidden print:hidden ${
        shown
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <WhatsAppIcon size={20} />
      <span className="text-small">WhatsApp us</span>
    </a>
  );
}
