import type { MetadataRoute } from "next";
import { liveTools } from "@/lib/tools";
import { toolUrl } from "@/lib/links";

/* Served at /tools/sitemap.xml.
 *
 * The MAIN repo's sitemap gains a single /tools index entry at flip time; this
 * file owns everything below it. Both are listed in the main repo's robots.ts —
 * a proxied subdirectory has no robots.txt of its own, so a crawler never fetches
 * one from this origin.
 *
 * LIVE tools only, from the same registry the hub renders. A planned tool has no
 * route, and submitting a 404 to a search engine is how a sitemap stops being
 * trusted. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: toolUrl("/"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...liveTools.map((tool) => ({
      url: toolUrl(`/${tool.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
