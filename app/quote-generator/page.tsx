import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import CtaBand from "@/components/CtaBand";
import FaqList from "@/components/FaqList";
import JsonLd from "@/components/JsonLd";
import MainSiteLink from "@/components/MainSiteLink";
import QuoteBuilder from "@/components/QuoteBuilder";
import { Section, SectionHeader } from "@/components/Section";
import { canonicalPath, MAIN, toolUrl } from "@/lib/links";
import { toolBreadcrumbs, toolGraph } from "@/lib/seo";
import { getTool } from "@/lib/tools";
import type { FaqItem } from "@/lib/types";

/* Copy source: docs/copy/tools.md (DRAFT — not owner-approved).
 *
 * Note the print:hidden on every section except the builder. The builder holds
 * the printable document, and everything around it is website. */

const tool = getTool("quote-generator")!;

export const metadata: Metadata = {
  title: "Free Quote & Invoice Generator",
  description:
    "Fill in a clean, printable quote or invoice and save it as a PDF from your browser. Free, no signup, and nothing you type is sent anywhere.",
  alternates: { canonical: canonicalPath("/quote-generator") },
  openGraph: {
    title: "Free Quote & Invoice Generator — DebugSwift",
    description:
      "A clean, printable quote or invoice in a couple of minutes. No signup, nothing sent anywhere.",
    url: toolUrl("/quote-generator"),
  },
};

const faqs: FaqItem[] = [
  {
    question: "Is this a proper GST tax invoice?",
    answer:
      "No, and this is the one thing worth reading twice. It produces a plain quote or invoice. A GST-compliant tax invoice also needs your GSTIN, the customer's GSTIN, HSN or SAC codes and the place of supply, and this doesn't produce any of them. If you're registered, check with your accountant before using it for anything you'll file.",
  },
  {
    question: "Where does what I type get stored?",
    answer:
      "In your own browser, so a refresh doesn't destroy your work — and nowhere else. The builder makes no request that carries anything you typed. Being exact, since we're inviting you to check: the page loads the same anonymous page-view counter as every other page on this site, so the network tab will show one script. It records that the page was opened and never sees these fields. The “Clear everything” button wipes the saved draft, as does clearing site data.",
  },
  {
    question: "How do I get a PDF?",
    answer:
      "Press “Print or save as PDF” and choose “Save as PDF” as the destination. That's your browser's own PDF export rather than something we generate — it's already on your machine, it handles fonts and page breaks properly, and it means nothing has to be uploaded to produce a file.",
  },
  {
    question: "Will the numbers add up correctly?",
    answer:
      "Yes. Amounts are worked out in whole paise rather than decimals, so the total always matches the lines above it. That sounds obvious, and it's the bug in a surprising number of spreadsheet templates — a column of decimals can round to a total that's a paise off what's printed.",
  },
];

export default function QuoteGeneratorPage() {
  return (
    <>
      <JsonLd data={toolGraph(tool, faqs)} />

      <Section band="cream" innerClassName="pb-10 md:pb-16" className="print:hidden">
        <Breadcrumbs trail={toolBreadcrumbs(tool)} />
        <div className="mt-8">
          <SectionHeader
            as="h1"
            eyebrow="Quote & Invoice Generator"
            title="A quote you'd be happy to send."
            lede="Fill it in, print it, or save it as a PDF straight from your browser. No signup, no watermark, and nothing you type leaves your machine."
          />
        </div>
      </Section>

      {/* The one section that survives printing. */}
      <Section band="cream" innerClassName="pt-0 md:pt-0 print:py-0">
        <div className="max-w-4xl">
          <QuoteBuilder />
        </div>
      </Section>

      <Section band="sand" className="print:hidden">
        <SectionHeader
          eyebrow="What this is"
          title="A document, not an accounting package."
          lede="It fills in one quote or one invoice and hands it back. It doesn't track what you've sent, chase payment, or file anything — and it doesn't ask you to sign up so that it could."
        />
        <div className="mt-10 max-w-2xl space-y-4 text-slate">
          <p>
            The numbers are worked out in whole paise rather than decimals, so
            the total always agrees with the lines above it. Leave the tax rate
            blank and no tax row appears at all, which is the correct document if
            you aren&apos;t registered.
          </p>
          <p>
            If chasing quotes and invoices is genuinely eating your week, the fix
            isn&apos;t a better form — it&apos;s{" "}
            <MainSiteLink
              href={MAIN.service(tool.relatedService)}
              className="font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
            >
              business process automation
            </MainSiteLink>
            . That&apos;s a conversation, not a tool.
          </p>
        </div>
      </Section>

      <Section band="cream" className="print:hidden">
        <div className="max-w-3xl">
          <FaqList items={faqs} heading="Common questions" />
        </div>
      </Section>

      <div className="print:hidden">
        <CtaBand
          eyebrow="Beyond the paperwork"
          title="Sending the quote is the easy part."
          body="If the slow bit is everything around it — the chasing, the retyping, the spreadsheet nobody trusts — that's the thing worth fixing."
        />
      </div>
    </>
  );
}
