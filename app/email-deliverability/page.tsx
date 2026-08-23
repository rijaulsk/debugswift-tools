import type { Metadata } from "next";
import { Suspense } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import CtaBand from "@/components/CtaBand";
import EmailCheck from "@/components/EmailCheck";
import FaqList from "@/components/FaqList";
import JsonLd from "@/components/JsonLd";
import LedgerList from "@/components/LedgerList";
import MainSiteLink from "@/components/MainSiteLink";
import { Section, SectionHeader } from "@/components/Section";
import ToolVisual from "@/components/ToolVisual";
import { canonicalPath, MAIN, toolUrl } from "@/lib/links";
import { toolBreadcrumbs, toolGraph } from "@/lib/seo";
import { getTool } from "@/lib/tools";
import type { FaqItem } from "@/lib/types";

/* Copy source: docs/copy/tools.md (DRAFT — not owner-approved). */

const tool = getTool("email-deliverability")!;

export const metadata: Metadata = {
  title: "Free Email Deliverability Check",
  description:
    "Check the SPF, DKIM, DMARC and MX records that decide whether your email reaches the inbox or the spam folder. Reads public DNS. Free, no signup.",
  alternates: { canonical: canonicalPath("/email-deliverability") },
  openGraph: {
    title: "Free Email Deliverability Check — DebugSwift",
    description:
      "The four DNS records that decide whether your email arrives. Free, no signup.",
    url: toolUrl("/email-deliverability"),
  },
};

const records: { title: string; body: string }[] = [
  {
    title: "SPF",
    body: "The list of servers allowed to send email using your domain name. Without it, anyone can send mail that claims to be from you — and receivers have nothing to check yours against.",
  },
  {
    title: "DKIM",
    body: "A signature on every message, so a receiver can prove it wasn't altered on the way and really came from you. It's the check that survives being forwarded, which SPF doesn't.",
  },
  {
    title: "DMARC",
    body: "The instruction that turns the other two from published opinion into an enforced rule — and the only way to find out that somebody else is sending mail as you.",
  },
  {
    title: "MX",
    body: "Where mail addressed to your domain gets delivered. Worth confirming even when you only send, because a missing one means anything sent back to you is going nowhere.",
  },
];

const faqs: FaqItem[] = [
  {
    question: "Why would my email be going to spam without me knowing?",
    answer:
      "Because nothing tells you. There's no bounce and no error — a receiving server quietly decides your message looks unauthenticated and files it away. The customer says they never got the invoice, you assume they missed it, and you resend it into the same spam folder. It's the most expensive invisible problem a small business has, and it's diagnosable in about ten seconds from public records.",
  },
  {
    question: "You said you couldn't tell whether I have DKIM. Why not?",
    answer:
      "DKIM keys are published under a name your email provider picks — a \"selector\" — and DNS gives no way to list what exists under a domain. We try the dozen selectors the big providers use, so finding one is proof you have it, but not finding one only means it isn't on a name we could guess. That's why the result says \"couldn't tell\" rather than \"missing\". Your provider's admin settings will say whether DKIM is switched on.",
  },
  {
    question: "What's the SPF lookup limit, and why does it matter so much?",
    answer:
      "SPF is allowed ten DNS lookups, counted across every record it refers to — not just the ones you wrote. Go over and the record becomes invalid, and most receivers treat it as though you had no SPF at all, even though it looks perfectly correct in your DNS. It usually happens quietly: you add a fourth sending service, and one of your providers' own records changes underneath you. Most free checkers count only your top-level includes and tell you you're fine. This one follows the tree.",
  },
  {
    question: "Do you send a test email, or see any of my mail?",
    answer:
      "No. Every answer here comes from public DNS records — the same ones any mail server in the world can read before it decides what to do with your message. No mailbox is touched, no message is sent, and nothing is stored. It's the same anonymous page-view counter as every other page on this site, and it never sees the domain you typed.",
  },
  {
    question: "It says everything is fine. Does that guarantee delivery?",
    answer:
      "No, and nothing can. These four records are the part that's mechanical and checkable — they decide whether you're allowed to be believed. Whether you're actually wanted also depends on your sending history, how many people mark you as spam, and what else has been sent from your address in the past. Getting the records right removes the excuse; it doesn't remove the judgement.",
  },
];

export default function EmailDeliverabilityPage() {
  return (
    <>
      <JsonLd data={toolGraph(tool, faqs)} />

      <Section band="cream" innerClassName="pb-10 md:pb-16">
        <Breadcrumbs trail={toolBreadcrumbs(tool)} />
        <div className="mt-8 lg:grid lg:grid-cols-12 lg:items-start lg:gap-12">
          <div className="lg:col-span-7">
            <SectionHeader
              as="h1"
              eyebrow="Email Deliverability Check"
              title="Find out why your invoices land in spam."
              lede="Four DNS records decide whether a mail server trusts email sent from your domain. When they're wrong there's no bounce and no error — the message just quietly doesn't arrive. This reads all four and tells you which one to fix."
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
          {/* Required — EmailCheck reads ?domain= to auto-run, which is what
            * makes a result shareable with whoever manages the DNS. That is
            * very often not the person who ran it. See lib/params.ts. */}
          <Suspense fallback={<div className="text-slate">Loading the checker…</div>}>
            <EmailCheck />
          </Suspense>
        </div>
      </Section>

      <Section band="sand">
        <SectionHeader
          eyebrow="What gets checked"
          title="Four records, and what each one is for."
          lede="None of these live on your website. They're published in your domain's DNS, which is why a perfectly good site can sit alongside email that nobody receives."
        />
        <div className="mt-10 max-w-3xl">
          <LedgerList items={records} />
        </div>
        <p className="mt-8 max-w-2xl text-small text-slate">
          Getting these right is usually an afternoon with whoever runs your DNS.
          If the answer turns out to be that nobody does, that&apos;s what{" "}
          <MainSiteLink
            href={MAIN.service(tool.relatedService)}
            className="font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
          >
            technical consulting
          </MainSiteLink>{" "}
          is for.
        </p>
      </Section>

      <Section band="cream">
        <div className="max-w-3xl">
          <FaqList items={faqs} heading="Common questions" />
        </div>
      </Section>

      <CtaBand
        eyebrow="Beyond the records"
        title="Email arriving is the floor, not the finish."
        body="Records fixed is the part that's mechanical. Whether the message earns a reply is a different conversation, and a shorter one than you'd think."
      />
    </>
  );
}
