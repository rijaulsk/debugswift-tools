import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import CtaBand from "@/components/CtaBand";
import FaqList from "@/components/FaqList";
import JsonLd from "@/components/JsonLd";
import MainSiteLink from "@/components/MainSiteLink";
import ProjectScoper from "@/components/ProjectScoper";
import { Section, SectionHeader } from "@/components/Section";
import ToolVisual from "@/components/ToolVisual";
import { canonicalPath, MAIN, toolUrl } from "@/lib/links";
import { toolBreadcrumbs, toolGraph } from "@/lib/seo";
import { getTool } from "@/lib/tools";
import type { FaqItem } from "@/lib/types";

/* Copy source: docs/copy/tools.md (DRAFT — not owner-approved).
 *
 * This page answers "what does a website cost?" head on, and answers it by
 * explaining why we don't publish a number rather than by inventing one. That
 * is both the honest answer and, as it happens, a better one than the fake
 * calculators occupying that search — but the reason it is written this way is
 * the brief's locked no-public-pricing rule. */

const tool = getTool("project-scoper")!;

export const metadata: Metadata = {
  title: "Project Scoper — what a website or app actually involves",
  description:
    "Work out what your project actually includes and get a brief you can send to anyone quoting. No prices, no signup — just the scope, written down so three quotes are finally comparable.",
  alternates: { canonical: canonicalPath("/project-scoper") },
  openGraph: {
    title: "Project Scoper — DebugSwift",
    description:
      "Turn a vague idea into a brief you can get comparable quotes on. No prices, no signup.",
    url: toolUrl("/project-scoper"),
  },
};

const faqs: FaqItem[] = [
  {
    question: "Why doesn't this tell me a price?",
    answer:
      "Because any number it gave you would be made up. Two projects with identical tick-lists can differ several times over depending on what your content is like, what your existing systems are, and how quickly decisions get made — none of which a form knows. We quote after a conversation, at a fixed price agreed before work starts. A calculator that guessed would only be useful for making us look cheap until the real number arrived.",
  },
  {
    question: "So what use is it?",
    answer:
      "It writes down what you're asking for. The reason three quotes come back four times apart is almost never that one agency is greedy — it's that all three were asked a different question, and each filled the gaps with their own assumptions. Send the same brief to all three and the numbers become comparable.",
  },
  {
    question: "Where do the build times come from?",
    answer:
      "They're what we would budget for each piece of work, and the tool shows the days each item adds so the total is something you can check rather than take on trust. They're a statement about how we work, not a survey of the industry — nobody has measured that, and we're not going to pretend otherwise.",
  },
  {
    question: "Is the brief any use if I'm not hiring you?",
    answer:
      "Yes, that's rather the point. Copy it and send it to whoever you like. A business that knows what it's asking for gets better work from everyone, including from the agency that isn't us.",
  },
];

export default function ProjectScoperPage() {
  return (
    <>
      <JsonLd data={toolGraph(tool, faqs)} />

      <Section band="cream" innerClassName="pb-10 md:pb-16">
        <Breadcrumbs trail={toolBreadcrumbs(tool)} />
        <div className="mt-8 lg:grid lg:grid-cols-12 lg:items-start lg:gap-12">
          <div className="lg:col-span-7">
            <SectionHeader
              as="h1"
              eyebrow="Project Scoper"
              title="Work out what you're actually asking for."
              lede="Three quotes that differ by four times usually means three people were asked three different questions. This turns a vague idea into a written brief you can send to all of them unchanged — and tells you what any of them will ask you next."
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
          <ProjectScoper />
        </div>
      </Section>

      <Section band="sand">
        <SectionHeader
          eyebrow="The obvious question"
          title="So what does it cost?"
          lede="We don't publish prices, and we'd rather say why than put a number on a page that turns out to be wrong for you."
        />
        <div className="mt-10 max-w-2xl space-y-4 text-slate">
          <p>
            Two projects with the same tick-list can differ several times over.
            Whether your content exists yet, whether the system it has to connect
            to has a usable interface, whether decisions take a day or a month —
            those move the number far more than the feature list does, and none
            of them fit in a form.
          </p>
          <p>
            So the honest version is: work out the scope here, then have a
            twenty-minute conversation and get a fixed price for exactly that.
            Fixed price agreed before work starts. No hourly billing, no
            surprises.
          </p>
          <p>
            If you&apos;re not sure the project is the right one to be doing at
            all, that&apos;s worth saying out loud too — it&apos;s what{" "}
            <MainSiteLink
              href={MAIN.service(tool.relatedService)}
              className="font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
            >
              technical consulting
            </MainSiteLink>{" "}
            is for, and it is a cheaper conversation than a build.
          </p>
        </div>
      </Section>

      <Section band="cream">
        <div className="max-w-3xl">
          <FaqList items={faqs} heading="Common questions" />
        </div>
      </Section>

      <CtaBand
        eyebrow="Next"
        title="Bring the brief. Get a fixed price for it."
        body="Twenty minutes on what you've just written down, and a number you can hold us to."
      />
    </>
  );
}
