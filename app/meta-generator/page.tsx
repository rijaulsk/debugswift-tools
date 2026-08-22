import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import CtaBand from "@/components/CtaBand";
import FaqList from "@/components/FaqList";
import JsonLd from "@/components/JsonLd";
import MainSiteLink from "@/components/MainSiteLink";
import MetaGenerator from "@/components/MetaGenerator";
import { Section, SectionHeader } from "@/components/Section";
import ToolVisual from "@/components/ToolVisual";
import { canonicalPath, MAIN, TOOLS, toolUrl } from "@/lib/links";
import {
  DESCRIPTION_PIXEL_BUDGET,
  TITLE_PIXEL_BUDGET,
} from "@/lib/meta/measure";
import { toolBreadcrumbs, toolGraph } from "@/lib/seo";
import { getTool } from "@/lib/tools";
import type { FaqItem } from "@/lib/types";

/* Copy source: docs/copy/tools.md (DRAFT — not owner-approved). */

const tool = getTool("meta-generator")!;

export const metadata: Metadata = {
  title: "Meta Tag & Headline Generator",
  description:
    "Write a title tag and meta description and see exactly where Google cuts them — measured in pixels, not characters. Free, nothing leaves your browser.",
  alternates: { canonical: canonicalPath("/meta-generator") },
  openGraph: {
    title: "Meta Tag & Headline Generator — DebugSwift",
    description:
      "See exactly where Google cuts your title tag — measured in pixels, not characters.",
    url: toolUrl("/meta-generator"),
  },
};

const faqs: FaqItem[] = [
  {
    question: "Why measure pixels instead of counting characters?",
    answer:
      "Because that's what Google does. It cuts the line when it runs out of room, and “Illinois plumbing inspections” takes far less room than the same number of capital Ws. A character counter will tell you a 55-character title is safe when it's already being cut, and that a 62-character one is too long when it fits fine.",
  },
  {
    question: "So my title will definitely show up like that?",
    answer:
      "No. Two caveats, both real. Google rewrites titles it judges unhelpful, whatever length they are — a title that fits is not a title that gets used. And the preview measures in Arial at Google's desktop sizes, which is close to their rendering but not identical. Treat the cut-off point as a good guide, not a guarantee.",
  },
  {
    question: "Is there AI behind the drafts?",
    answer:
      "No. The drafts are four title shapes and two description shapes filled in with what you typed — the specific thing first, the business name last, because the end of the line is what gets cut. It's formatting, not writing, and it's meant to be edited.",
  },
  {
    question: "Does anything I type get sent to you?",
    answer:
      "No. The tool runs entirely in your browser and makes no request that carries anything you typed — paste in unpublished page copy if you want to. Being exact, since we're inviting you to check: the page loads the same anonymous page-view counter as every other page on this site, so the network tab will show one script. It records that the page was opened and never sees these fields.",
  },
];

export default function MetaGeneratorPage() {
  return (
    <>
      <JsonLd data={toolGraph(tool, faqs)} />

      <Section band="cream" innerClassName="pb-10 md:pb-16">
        <Breadcrumbs trail={toolBreadcrumbs(tool)} />
        <div className="mt-8 lg:grid lg:grid-cols-12 lg:items-start lg:gap-12">
          <div className="lg:col-span-7">
            <SectionHeader
              as="h1"
              eyebrow="Meta & Headline Generator"
              title="See where Google actually cuts your title."
              lede={`Google truncates search results by pixel width, not by character count — so every tool that counts characters is measuring the wrong thing. This one measures the real width as you type, against ${TITLE_PIXEL_BUDGET}px for the title and ${DESCRIPTION_PIXEL_BUDGET}px for the description.`}
            />
          </div>
          {/* Counter-column artifact. Hidden below lg, like the hub's Deb: at
            * 390px a 380px figure would push the tool itself below the fold. */}
          <div className="mt-12 hidden justify-end lg:col-span-5 lg:mt-0 lg:flex">
            <ToolVisual artifact={tool.artifact} />
          </div>
        </div>
      </Section>

      <Section band="cream" innerClassName="pt-0 md:pt-0">
        <div className="max-w-3xl">
          {/* Suspense is REQUIRED, not decorative: MetaGenerator reads search
            * params (the audit hands a title over that way), and without a
            * boundary that would opt this whole page out of static rendering.
            * See lib/params.ts. */}
          <Suspense fallback={<div className="text-slate">Loading the editor…</div>}>
            <MetaGenerator />
          </Suspense>
        </div>
      </Section>

      <Section band="sand">
        <SectionHeader
          eyebrow="Why it's different"
          title="Character counters get this wrong."
          lede="Not by a little. Two titles of identical length can differ by well over a hundred pixels, which is the difference between a line that reads cleanly and one that ends mid-word."
        />
        <div className="mt-10 max-w-2xl space-y-4 text-slate">
          <p>
            The other thing worth knowing: the front of the line is what
            survives. Put the specific thing first and the business name last,
            because if anything gets cut, that&apos;s the end.
          </p>
          <p>
            If you got here from the{" "}
            {/* A route in THIS app → next/link with the UNPREFIXED path;
              * basePath adds the /tools. A MainSiteLink here would work by
              * accident and cost a full page load. See CLAUDE.md. */}
            <Link
              href={TOOLS.tool("website-audit")}
              className="font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
            >
              website audit
            </Link>{" "}
            telling you a title was too long, this is where to fix it. If the
            deeper problem is that nobody&apos;s searching for the thing the page
            is about, that&apos;s{" "}
            <MainSiteLink
              href={MAIN.service(tool.relatedService)}
              className="font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
            >
              SEO &amp; local visibility
            </MainSiteLink>{" "}
            work.
          </p>
        </div>
      </Section>

      <Section band="cream">
        <div className="max-w-3xl">
          <FaqList items={faqs} heading="Common questions" />
        </div>
      </Section>

      <CtaBand
        eyebrow="Beyond the tags"
        title="Tags fixed, phone still quiet?"
        body="Titles decide whether people click. What happens after the click is a different problem, and usually the more expensive one."
      />
    </>
  );
}
