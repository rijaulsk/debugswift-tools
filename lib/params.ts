"use client";

import { useSearchParams } from "next/navigation";

/* Reading prefill out of the URL.
 *
 * WHAT THIS MAKES POSSIBLE — and it is the point of the whole file — is that the
 * tools stop being separate pages. The audit can find a title that is too long
 * and hand it to the meta generator with the text already in the box. A result
 * becomes a link someone can send to their web person. That handoff is worth
 * more than any single tool.
 *
 * WHY useSearchParams AND NOT window.location.search. The first version of this
 * file read window.location during render, to avoid needing a Suspense
 * boundary. It worked on a full page load and silently failed on a CLIENT-SIDE
 * navigation — which is exactly how the handoff is used. Clicking "Measure it
 * properly" in an audit result rendered the meta generator before Next had
 * updated window.location, so it read the OLD page's query string, found no
 * title, and presented an empty box. The link was right; the value vanished.
 * Nothing about it looked broken.
 *
 * useSearchParams is wired into the router, so it is correct during client
 * navigation. The cost is that every component using it must sit inside a
 * <Suspense> boundary — which keeps the surrounding page statically
 * prerendered, so the pages stay indexable. That boundary is not optional: if
 * you add a param-reading tool, wrap it.
 */

/** All query params. Empty during the prerender inside the Suspense boundary. */
export function useParams(): URLSearchParams {
  return new URLSearchParams(useSearchParams().toString());
}

/** One param, trimmed and length-capped. */
export function useParam(key: string, maxLength = 2000): string {
  const value = useSearchParams().get(key) ?? "";
  return value.trim().slice(0, maxLength);
}

/**
 * Build a link to another tool with prefill.
 *
 * Returns a path WITHOUT the /tools basePath, because next/link adds it. Pass
 * the result to next/link, never to MainSiteLink — see CLAUDE.md.
 */
export function toolHref(slug: string, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") search.set(key, value);
  }
  const query = search.toString();
  return `/${slug}${query ? `?${query}` : ""}`;
}

/**
 * Replace the current URL's query without a navigation or a history entry.
 *
 * Used so a result is bookmarkable and shareable. `replaceState` rather than
 * `pushState`: re-running an audit is not a new page in the visitor's mind, and
 * filling their back button with a dozen entries is how a tool makes the back
 * button useless.
 */
export function setParamsInUrl(params: Record<string, string | undefined>): void {
  if (typeof window === "undefined") return;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") search.set(key, value);
  }
  const query = search.toString();
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${query ? `?${query}` : ""}`,
  );
}
