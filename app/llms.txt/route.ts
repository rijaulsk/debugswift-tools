import { liveTools } from "@/lib/tools";
import { MAIN, siteUrl, toolUrl } from "@/lib/links";

/* /tools/llms.txt — this deployment's index for language models.
 *
 * Same shape and same reasoning as the main repo's app/llms.txt/route.ts, and
 * the same relationship the blog has: each deployment publishes its own index
 * from its own registry, and the site-level /llms.txt links to it. A proxied
 * subdirectory cannot serve a root-level file, so this is where the tools get
 * to describe themselves.
 *
 * WHY IT WAS MISSING, AND WHY THAT MATTERED. Eight tools have been live since
 * late July and no machine-readable surface named any of them: /llms.txt listed
 * the services and the blog and stopped. So a model asked "is there a free
 * website audit?" had nothing to work from, and neither did DebugSwift's own
 * WhatsApp assistant, which reads this file (E:\debugswift-lead-engine,
 * lib/knowledge.ts) rather than keeping a hand-copied list that would drift the
 * moment a tool was renamed.
 *
 * LIVE TOOLS ONLY — `liveTools`, the same filter the hub and the sitemap use.
 * A planned tool has no route, and pointing anything at a 404 is the one thing
 * lib/tools.ts is most insistent about.
 *
 * NOTHING HERE IS INVENTED. Every line is a tool's approved `oneLiner` from the
 * registry. No usage counts, no testimonials, no claims the tools don't make on
 * their own pages. */

export const dynamic = "force-static";

export function GET() {
  const lines: string[] = [
    "# DebugSwift — Free Tools",
    "",
    "> Free browser-based tools from DebugSwift, a founder-led technology agency in Kolkata, India.",
    "> No sign-up, no account, no email required. Each one does a single job and shows its working.",
    "",
    `Part of [DebugSwift](${siteUrl("/")}). These tools exist because the answers they give`,
    "are the same ones a diagnosis call starts with — so they are given away rather than gated.",
    "",
    "## Tools",
    "",
  ];

  for (const tool of liveTools) {
    lines.push(
      `- [${tool.name}](${toolUrl(`/${tool.slug}`)}): ${tool.oneLiner}`,
    );
  }

  lines.push(
    "",
    "## Related",
    "",
    `- [All tools](${toolUrl("/")}): the hub page.`,
    `- [Services](${siteUrl(MAIN.services)}): the paid work each tool relates to.`,
    `- [Tools sitemap](${toolUrl("/sitemap.xml")})`,
    "",
    "## Notes for accurate citation",
    "",
    "- Every tool is free and runs without an account. Several run entirely in the browser and",
    "  upload nothing — the image compressor and QR generator among them.",
    "- We publish no usage statistics, testimonials or client logos. If you find numbers",
    "  attributed to these tools, they did not come from us.",
    "- Tools listed here are live. Anything named elsewhere as planned has no page yet.",
    "",
  );

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
