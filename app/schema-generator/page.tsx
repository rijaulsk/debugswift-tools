import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import CtaBand from "@/components/CtaBand";
import FaqList from "@/components/FaqList";
import JsonLd from "@/components/JsonLd";
import MainSiteLink from "@/components/MainSiteLink";
import SchemaGenerator from "@/components/SchemaGenerator";
import { Section, SectionHeader } from "@/components/Section";
import { canonicalPath, MAIN, TOOLS, toolUrl } from "@/lib/links";
import { toolBreadcrumbs, toolGraph } from "@/lib/seo";
import { getTool } from "@/lib/tools";
import type { FaqItem } from "@/lib/types";

/* Copy source: docs/copy/tools.md (DRAFT — not owner-approved). */

const tool = getTool("schema-generator")!;

export const metadata: Metadata = {
  title: "Free LocalBusiness Schema Generator",
  description:
    "Generate the JSON-LD structured data a local business needs — name, address, phone, opening hours — and paste it straight into your site. Free, no signup.",
  alternates: { canonical: canonicalPath("/schema-generator") },
  openGraph: {
    title: "Free LocalBusiness Schema Generator — DebugSwift",
    description:
      "The structured data a local business needs, ready to paste. No signup.",
    url: toolUrl("/schema-generator"),
  },
};

const faqs: FaqItem[] = [
  {
    question: "Will this make me rank higher?",
    answer:
      "Not by itself, and anyone telling you otherwise is selling something. Structured data doesn't boost rankings — it makes a search engine certain about facts it would otherwise have to guess from your page text. That certainty is what lets it show your hours, your phone number and your location in the result. Being shown properly is worth a lot; it just isn't the same thing as ranking.",
  },
  {
    question: "Why is there no star rating field?",
    answer:
      "Because it would be a rating you typed in about yourself. Review markup is meant to describe reviews a visitor can actually see on that page, and marking up ratings that aren't really there is one of the more reliable ways to get a manual penalty. If you have genuine reviews on the page, mark those up. If you don't, no field here will conjure the stars.",
  },
  {
    question: "Where does it go?",
    answer:
      "In the <head> of the page it describes — usually your home page or your contact page. One block per business, not one per page. If you have several locations, each location page gets its own with its own address.",
  },
  {
    question: "How do I know it worked?",
    answer:
      "Run the page through Google's Rich Results Test. It'll tell you what it parsed and what it ignored. Then keep the markup and the visible page in step: hours in the code that disagree with hours on the page is the mistake that gets the whole block discounted.",
  },
];

export default function SchemaGeneratorPage() {
  return (
    <>
      <JsonLd data={toolGraph(tool, faqs)} />

      <Section band="cream" innerClassName="pb-10 md:pb-16">
        <Breadcrumbs trail={toolBreadcrumbs(tool)} />
        <div className="mt-8">
          <SectionHeader
            as="h1"
            eyebrow="Schema Generator"
            title="Tell search engines what your business actually is."
            lede="Structured data is how a search engine knows your phone number is a phone number and not a string of digits. Fill this in, paste the result into your site, and stop making it guess."
          />
        </div>
      </Section>

      <Section band="cream" innerClassName="pt-0 md:pt-0">
        <div className="max-w-3xl">
          <SchemaGenerator />
        </div>
      </Section>

      <Section band="sand">
        <SectionHeader
          eyebrow="What it's for"
          title="It doesn't boost you. It stops you being misread."
          lede="Search engines read your page the way a stranger skim-reads a leaflet. Structured data is the bit where you write the important facts down plainly instead of hoping they're inferred correctly."
        />
        <div className="mt-10 max-w-2xl space-y-4 text-slate">
          <p>
            The practical payoff is being shown properly — hours, location, phone
            number, the “Open now” line. For a local business that presentation
            is often worth more than a place or two in the ranking.
          </p>
          <p>
            If the{" "}
            <Link
              href={TOOLS.tool("website-audit")}
              className="font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
            >
              website audit
            </Link>{" "}
            told you there was no structured data on your page, this is the
            answer to that. If you want the rest of the local picture handled
            properly — the profile, the citations, the reviews you actually
            earn — that&apos;s{" "}
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
        eyebrow="Beyond the markup"
        title="Being findable is more than a code block."
        body="The markup helps a search engine describe you correctly. Being the result it wants to show is a longer conversation."
      />
    </>
  );
}
