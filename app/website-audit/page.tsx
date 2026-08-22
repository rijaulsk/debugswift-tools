import type { Metadata } from "next";
import { Suspense } from "react";
import AuditForm from "@/components/AuditForm";
import Breadcrumbs from "@/components/Breadcrumbs";
import CtaBand from "@/components/CtaBand";
import FaqList from "@/components/FaqList";
import JsonLd from "@/components/JsonLd";
import MainSiteLink from "@/components/MainSiteLink";
import { Section, SectionHeader } from "@/components/Section";
import ToolVisual from "@/components/ToolVisual";
import { TOTAL_CHECKS } from "@/lib/audit/checks";
import { canonicalPath, MAIN, toolUrl } from "@/lib/links";
import { toolBreadcrumbs, toolGraph } from "@/lib/seo";
import { getTool } from "@/lib/tools";
import type { FaqItem } from "@/lib/types";

/* Copy source: docs/copy/tools.md (DRAFT — not owner-approved). The eighteen
 * check strings are NOT here; they live beside the logic in lib/audit/checks.ts
 * so a check and its description cannot drift apart. */

const tool = getTool("website-audit")!;

export const metadata: Metadata = {
  title: "Free Website Audit",
  description: `Paste a web address and see ${TOTAL_CHECKS} checks on whether the page can be found, read and acted on. Free, no signup, full result on screen.`,
  alternates: { canonical: canonicalPath("/website-audit") },
  openGraph: {
    title: "Free Website Audit — DebugSwift",
    description: `${TOTAL_CHECKS} checks on whether a page can be found, read and acted on. No signup.`,
    url: toolUrl("/website-audit"),
  },
};

const faqs: FaqItem[] = [
  {
    question: "Is this really free?",
    answer:
      "Yes, and there's no email step. You get the full result on screen. We build this kind of thing for a living, and a tool that's useful before you pay is a better argument than a case study.",
  },
  {
    question: "Does a perfect score mean my site is fine?",
    answer: `No. It means ${TOTAL_CHECKS} specific things are in order on one page. It says nothing about whether the page is persuasive, whether the right people find it, or whether the phone rings. Those are the questions worth asking next.`,
  },
  {
    question: "You said my response time was slow. Is that reliable?",
    answer:
      "It's one request from one server, at one moment. Treat it as a hint, not a verdict — if it looks bad, confirm it with a proper speed test before spending money on it. We say the same thing in the result itself.",
  },
  {
    question: "Do you store the pages you check?",
    answer:
      "The audit runs when you ask for it and the result is sent straight back to your browser. We don't keep a copy, and there's no account to attach it to.",
  },
];

/* The five groups, named exactly as the report renders them. Duplicated as prose
 * here on purpose: this section is what a search engine reads, and it has to
 * describe the report a visitor actually gets. If a group is renamed in
 * lib/audit/types.ts, rename it here in the same commit. */
const groups: [string, string][] = [
  [
    "Findability",
    "whether search engines can reach and index it at all — including the leftover rules that quietly keep a page out.",
  ],
  ["On the page", "the title, description, heading structure and alt text."],
  [
    "How it shares",
    "what the link looks like pasted into WhatsApp, and whether the preview image actually loads.",
  ],
  ["Getting in touch", "whether a visitor on a phone can act in one tap."],
  [
    "Delivery",
    "response time, the measured weight of your images, compression, caching and what blocks the page from drawing.",
  ],
];

export default function WebsiteAuditPage() {
  return (
    <>
      <JsonLd data={toolGraph(tool, faqs)} />

      {/* print:hidden on everything except the form section, which holds the
        * report. A printed audit should be the findings, not the marketing
        * page around them. */}
      <Section band="cream" innerClassName="pb-10 md:pb-16" className="print:hidden">
        <Breadcrumbs trail={toolBreadcrumbs(tool)} />
        <div className="mt-8 lg:grid lg:grid-cols-12 lg:items-start lg:gap-12">
          <div className="lg:col-span-7">
            <SectionHeader
              as="h1"
              eyebrow="Website Audit"
              title="See your page the way a search engine does."
              lede={`Paste a web address. We fetch the page once, run ${TOTAL_CHECKS} checks on whether it gets found and whether a visitor can act on it, and show you every answer — including the ones that pass.`}
            />
          </div>
          {/* Counter-column artifact. Hidden below lg, like the hub's Deb: at
            * 390px a 380px figure would push the tool itself below the fold. */}
          <div className="mt-12 hidden justify-end lg:col-span-5 lg:mt-0 lg:flex">
            <ToolVisual artifact={tool.artifact} />
          </div>
        </div>
      </Section>

      {/* The tool itself sits directly under the hero — above the explanation of
       * what it does. Someone who arrived from a search for "free website audit"
       * came to use it, not to read about it. */}
      <Section band="cream" innerClassName="pt-0 md:pt-0 print:py-0">
        <div className="max-w-3xl">
          {/* Required — AuditForm reads ?url= to auto-run, which is what makes
            * a report shareable. See lib/params.ts. */}
          <Suspense fallback={<div className="text-slate">Loading the audit…</div>}>
            <AuditForm />
          </Suspense>
        </div>
      </Section>

      <Section band="sand" className="print:hidden">
        <SectionHeader
          eyebrow="What's in the report"
          title={`${TOTAL_CHECKS} checks, in five groups.`}
          lede="Every one is measured on the page you give us. There are no benchmarks, no scores borrowed from other sites, and no “businesses like yours” — we haven't surveyed them, so we won't pretend we have."
        />
        <ol className="mt-10 divide-y-[1.5px] divide-mist border-y-[1.5px] border-mist">
          {groups.map(([name, detail], i) => (
            <li key={name} className="flex gap-6 py-5">
              {/* Ledger gutter — tabular numerals in the design system's
               * numbering role, not filled circles. */}
              <span className="pt-1 text-small tabular-nums text-slate">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-ink">
                <span className="font-medium">{name}</span>
                <span className="text-slate"> — {detail}</span>
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-8 max-w-2xl text-small text-slate">
          Most of it is fixable in an afternoon by whoever built the site. If the
          list points at something structural, that&apos;s what{" "}
          <MainSiteLink
            href={MAIN.service(tool.relatedService)}
            className="font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
          >
            SEO &amp; local visibility
          </MainSiteLink>{" "}
          work is for.
        </p>
      </Section>

      <Section band="cream" className="print:hidden">
        <div className="max-w-3xl">
          <FaqList items={faqs} heading="Common questions" />
        </div>
      </Section>

      <div className="print:hidden">
      <CtaBand
        eyebrow="After the report"
        title="Want these fixed rather than listed?"
        body="The report tells you what's wrong. If you'd rather not spend a weekend on it, that's the job."
      />
      </div>
    </>
  );
}
