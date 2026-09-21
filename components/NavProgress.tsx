"use client";

import { useEffect, useState } from "react";

/* Feedback for the one navigation this app cannot make feel instant.
 *
 * Links within /tools are client-routed and land in a few frames, so they need
 * nothing. Every Header and Footer link OUT of here — /services, /about,
 * /contact, /blog — is a full document load into a different Next deployment,
 * which is why they are bare <a> through MainSiteLink rather than next/link.
 * Until the new document paints, the browser leaves this page on screen with
 * no sign that the click registered. On a phone on a slow connection that gap
 * reads as a dead button, and the usual response is to tap it again.
 *
 * Why a bar and not a skeleton: a skeleton is a promise about shape, and here
 * the shape is unknown — this page still owns the screen and there is nothing
 * yet to draw. Why not a spinner: a spinner centres attention on the waiting.
 * A 2px bar on the top edge says "your click landed" and gets out of the way.
 * See design system §11.
 *
 * aria-hidden on purpose: browsers and screen readers already announce a
 * document navigation, and a live region here would say it twice. */

/** True for a URL that leaves this deployment. */
function isCrossApp(url: URL): boolean {
  if (url.origin !== window.location.origin) return false;
  return !/^\/tools(\/|$)/.test(url.pathname);
}

export default function NavProgress() {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      /* Modified clicks open a new tab, so this page is not going anywhere. */
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (isCrossApp(url)) setPending(true);
    };

    /* If the navigation never happens — the user hits Escape, the request
     * fails, or they come back through bfcache — the bar must not be left
     * running. */
    const clear = () => setPending(false);

    document.addEventListener("click", onClick);
    window.addEventListener("pageshow", clear);
    window.addEventListener("visibilitychange", clear);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("pageshow", clear);
      window.removeEventListener("visibilitychange", clear);
    };
  }, []);

  if (!pending) return null;
  return <div className="nav-progress" aria-hidden="true" />;
}
