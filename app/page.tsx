import type { Metadata } from "next";
import Link from "next/link";
import CtaBand from "@/components/CtaBand";
import JsonLd from "@/components/JsonLd";
import { Section } from "@/components/Section";
import ToolRack, { type RackItem } from "@/components/ToolRack";
import ToolVisual, { ToolIcon } from "@/components/ToolVisual";
import { canonicalPath, toolUrl, TOOLS } from "@/lib/links";
import { collectionPageJsonLd } from "@/lib/seo";
import { toolGroups, tools } from "@/lib/tools";

/* THE HUB, AND IT IS A RACK RATHER THAN A PAGE ABOUT A RACK.
 *
 * Everything on it is rendered from lib/tools.ts — there is no hand-written
 * list of tools here, so shipping a tool puts it on this page.
 *
 * It used to open with an eyebrow, an h1, a lede and a mascot, and the mascot
 * was `hidden lg:flex`, so on a phone the first screen was three lines of type
 * on cream. DuctForge's own page says the thing this is built on: "anyone who
 * opens this has a duct to price, and a splash screen would be a click between
 * them and it." Anyone who opens /tools has a job. The tools themselves are now
 * the first thing on the page, and what little framing they need rides along
 * the top of the rack instead of above it.
 *
 * WHY EVERY CARD CARRIES ITS ARTIFACT. The nine ToolVisual figures already
 * existed and were used only on the individual tool pages, so the hub — the
 * page that has to make someone want to open one — was the one place that
 * showed nothing of what the tools produce. Nine icon-and-text cards differ
 * only in their wording and read as a list of links. Nine pictures of a report,
 * a search result, an invoice and a palette read as tools.
 *
 * THE HONESTY RULE CARRIES OVER UNCHANGED. ToolVisual's own header is binding:
 * these are illustrations of the DELIVERABLE, never of a result anyone got.
 * Shrinking one to card size must not turn any number in it into a claim.
 *
 * ONE THING TO WATCH IF THE REGISTRY IS EVER REORDERED. The `palette` artifact
 * contains a single clay-500 swatch — the one clay in any of the nine, and a
 * swatch rather than a CTA. brand-kit sits sixth of nine, so on both the
 * two-column and the one-column grid that card is rows away from the CtaBand,
 * which carries the page's real clay element. Move brand-kit to LAST and the
 * two would share a viewport, which is the ration the design system rations.
 * The filter chips are ink for the same reason: four clay chips would have
 * blown it outright.
 *
 * Copy source: docs/copy/tools.md (DRAFT — not owner-approved). */

export const metadata: Metadata = {
  title: "Free Tools",
  description:
    "Free, no-signup tools for small businesses: a website audit, generators and calculators. Straight answers, no email wall.",
  alternates: { canonical: canonicalPath("/") },
  openGraph: {
    title: "Free Tools — DebugSwift",
    description:
      "Free, no-signup tools for small businesses. Straight answers, no email wall.",
    url: toolUrl("/"),
  },
};

const live = tools.filter((t) => t.status === "live");
const planned = tools.filter((t) => t.status === "planned");

export default function ToolsHub() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      collectionPageJsonLd({
        name: "Free Tools",
        description:
          "Free, no-signup tools for small businesses from DebugSwift.",
        url: toolUrl("/"),
        /* LIVE tools only. Listing a planned tool in structured data would be
         * telling a crawler about a URL that 404s. */
        items: live.map((t) => ({ name: t.name, url: toolUrl(`/${t.slug}`) })),
      }),
    ],
  };

  /* Cards are built HERE, on the server, and handed to the client shell as
   * children. ToolRack only decides which are shown — see its header for why
   * that split matters when each card holds a twenty-element artifact. */
  const items: RackItem[] = live.map((tool) => ({
    slug: tool.slug,
    group: tool.group,
    haystack: `${tool.name} ${tool.oneLiner} ${tool.navLine}`.toLowerCase(),
    card: (
      /* The whole card is the target — a 40px link inside a 400px card is a
       * target-size failure waiting to happen.
       *
       * Hover choreography ported from the marketing repo's ServiceCard: border
       * warms to indigo, card lifts 2px, arrow nudges. 200ms, no shadow, the
       * lift IS the tactile cue. */
      <Link
        href={TOOLS.tool(tool.slug)}
        className="group flex h-full flex-col overflow-hidden rounded-card border-[1.5px] border-ink bg-paper transition duration-200 ease-out hover:-translate-y-0.5 hover:border-indigo-600"
      >
        {/* The artifact gives up its own frame at this size; the card's border
         * is the frame. aria-hidden because it is a picture of the output and
         * the text below already names the tool — a screen reader reading out
         * sample invoice rows would be noise, not information. */}
        <div aria-hidden="true" className="border-b-[1.5px] border-mist">
          <ToolVisual artifact={tool.artifact} compact />
        </div>
        <div className="flex flex-1 flex-col p-6">
          <p className="flex items-center gap-2.5 text-h3 font-medium text-ink group-hover:text-indigo-700">
            <span aria-hidden="true" className="text-indigo-600">
              <ToolIcon artifact={tool.artifact} />
            </span>
            {tool.name}
          </p>
          <p className="mt-3 flex-1 text-slate">{tool.oneLiner}</p>
          <span className="mt-6 inline-flex items-center gap-2 font-medium text-indigo-600">
            Open the tool
            <span
              aria-hidden="true"
              className="transition-transform duration-200 ease-out group-hover:translate-x-1"
            >
              →
            </span>
          </span>
        </div>
      </Link>
    ),
  }));

  return (
    <>
      <JsonLd data={graph} />

      <Section band="cream">
        {/* The whole of the framing: what these are, and the two facts a
         * visitor actually wants before clicking. One h1, kept short, sitting
         * on the same line of sight as the filters rather than a screen above
         * them. */}
        <div className="mb-8 max-w-2xl text-center md:text-left">
          <p className="text-eyebrow uppercase text-indigo-600">Free Tools</p>
          <h1 className="mt-4 text-h1-mobile md:text-h1">
            {live.length} tools. No signup.
          </h1>
          <p className="mt-4 text-slate">
            Each one gives you a straight answer and then gets out of the way.
            Nothing is emailed to you, and nothing is kept.
          </p>
        </div>

        <ToolRack items={items} groups={toolGroups} />
      </Section>

      {planned.length > 0 && (
        <Section band="sand">
          <p className="text-eyebrow uppercase text-indigo-600">On the bench</p>
          {/* Named, NOT linked. A link to a tool that doesn't exist is a lie a
           * visitor finds by clicking — see the `status` rule in lib/tools.ts. */}
          <ul className="mt-6 divide-y-[1.5px] divide-mist border-y-[1.5px] border-mist">
            {planned.map((tool) => (
              <li key={tool.slug} className="py-4">
                <p className="font-medium text-ink">{tool.name}</p>
                <p className="mt-1 text-small text-slate">{tool.oneLiner}</p>
              </li>
            ))}
          </ul>
          <p className="mt-5 max-w-xl text-small text-slate">
            These aren&apos;t built yet. They&apos;re listed because it&apos;s
            the plan, not because they&apos;re hiding behind a signup.
          </p>
        </Section>
      )}

      <CtaBand
        eyebrow="Beyond the tools"
        title="Something the tool can't tell you?"
        body="A tool checks a page. A conversation finds the thing that's actually costing you money. Twenty minutes, no charge, no pitch."
      />
    </>
  );
}
