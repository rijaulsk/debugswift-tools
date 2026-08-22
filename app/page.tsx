import type { Metadata } from "next";
import Link from "next/link";
import CtaBand from "@/components/CtaBand";
import Deb from "@/components/Deb";
import JsonLd from "@/components/JsonLd";
import { Section, SectionHeader } from "@/components/Section";
import { ToolIcon } from "@/components/ToolVisual";
import { canonicalPath, toolUrl, TOOLS } from "@/lib/links";
import { collectionPageJsonLd } from "@/lib/seo";
import { tools } from "@/lib/tools";

/* The hub. Everything on it is rendered from lib/tools.ts — there is no
 * hand-written list of tools on this page, so shipping a tool puts it here.
 *
 * Copy source: docs/copy/tools.md (DRAFT — not owner-approved). */

export const metadata: Metadata = {
  title: "Free Tools",
  description:
    "Free, no-signup tools for small businesses — a website audit, generators and calculators. Straight answers, no email wall.",
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

  return (
    <>
      <JsonLd data={graph} />

      <Section band="cream">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <SectionHeader
              as="h1"
              eyebrow="Free Tools"
              title="Useful before you ever pay us."
              lede="Small tools that give you a straight answer and then get out of the way. No signup, no email wall, no drip sequence afterwards."
            />
          </div>
          {/* Deb overlapping the column boundary is this page's ONE intentional
           * grid break. She is the only richly-animated element (float). */}
          <div className="mt-12 hidden justify-end lg:col-span-5 lg:mt-0 lg:flex">
            <Deb pose="thinking" width={240} float />
          </div>
        </div>
      </Section>

      <Section band="sand">
        <p className="text-eyebrow uppercase text-indigo-600">Ready now</p>
        <ul className="mt-6 grid gap-6 md:grid-cols-2">
          {live.map((tool) => (
            <li key={tool.slug}>
              {/* The whole card is the target — a 40px link inside a 200px card
               * is a target-size failure waiting to happen.
               *
               * Hover choreography ported from the marketing repo's
               * ServiceCard: border warms to indigo, card lifts 2px, arrow
               * nudges — 200ms, no shadow, the lift IS the tactile cue. Eight
               * cards differing only in their wording read as a list of links;
               * the glyph and the lift are what make them read as tools. */}
              <Link
                href={TOOLS.tool(tool.slug)}
                className="group flex h-full flex-col rounded-card border-[1.5px] border-ink bg-paper p-6 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-indigo-600"
              >
                <span
                  aria-hidden="true"
                  className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-[10px] border-[1.5px] border-mist bg-indigo-50 text-indigo-600 transition-colors duration-200 ease-out group-hover:border-indigo-200 group-hover:bg-indigo-100"
                >
                  <ToolIcon artifact={tool.artifact} />
                </span>
                <p className="text-h3 font-medium text-ink group-hover:text-indigo-700">
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
              </Link>
            </li>
          ))}
        </ul>

        {planned.length > 0 && (
          <div className="mt-16">
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
          </div>
        )}
      </Section>

      <CtaBand
        eyebrow="Beyond the tools"
        title="Something the tool can't tell you?"
        body="A tool checks a page. A conversation finds the thing that's actually costing you money. Twenty minutes, no charge, no pitch."
      />
    </>
  );
}
