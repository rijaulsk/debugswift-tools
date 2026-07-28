import type { Metadata } from "next";
import BrandKit from "@/components/BrandKit";
import Breadcrumbs from "@/components/Breadcrumbs";
import CtaBand from "@/components/CtaBand";
import FaqList from "@/components/FaqList";
import JsonLd from "@/components/JsonLd";
import MainSiteLink from "@/components/MainSiteLink";
import { Section, SectionHeader } from "@/components/Section";
import { canonicalPath, MAIN, toolUrl } from "@/lib/links";
import { toolBreadcrumbs, toolGraph } from "@/lib/seo";
import { getTool } from "@/lib/tools";
import type { FaqItem } from "@/lib/types";

/* Copy source: docs/copy/tools.md (DRAFT — not owner-approved). */

const tool = getTool("brand-kit")!;

export const metadata: Metadata = {
  title: "Free Brand Kit Generator",
  description:
    "Turn one brand colour into a ten-step palette with contrast measured on every step, plus a matching type scale. Copy the CSS and go. Free, no signup.",
  alternates: { canonical: canonicalPath("/brand-kit") },
  openGraph: {
    title: "Free Brand Kit Generator — DebugSwift",
    description:
      "One colour into a ten-step palette, with WCAG contrast measured on every step.",
    url: toolUrl("/brand-kit"),
  },
};

const faqs: FaqItem[] = [
  {
    question: "What makes this different from other palette generators?",
    answer:
      "Two things. The ramp is built in a perceptual colour space, so the steps look evenly spaced instead of merely being evenly spaced in numbers — the usual approach produces muddy middles and ends that bunch up. And every step tells you whether black or white text actually passes contrast on it, which is the question you'll hit the moment you try to use the colour.",
  },
  {
    question: "Are the contrast numbers reliable?",
    answer:
      "They're the WCAG 2.1 formula computed on the exact hex shown, so yes. Worth being precise about what they cover: contrast between a text colour and a solid background. They say nothing about text over a photo, over a gradient, or at a weight so light it's hard to read at any ratio.",
  },
  {
    question: "Is this my brand identity, then?",
    answer:
      "No. It's a starting palette and a type scale — the mechanical part. A brand is what you sound like and what you're for, and no tool derives that from a hex code. This gets you a coherent set of colours to build with instead of picking shades one at a time until they clash.",
  },
  {
    question: "Why does one of my steps say no text colour passes?",
    answer:
      "Because it's a mid-tone. Colours in the middle of the lightness range are too dark for black text and too light for white, and no amount of wanting changes that. Use it for a shape, a border, or a chart fill, and put words on the steps that pass.",
  },
];

export default function BrandKitPage() {
  return (
    <>
      <JsonLd data={toolGraph(tool, faqs)} />

      <Section band="cream" innerClassName="pb-10 md:pb-16">
        <Breadcrumbs trail={toolBreadcrumbs(tool)} />
        <div className="mt-8">
          <SectionHeader
            as="h1"
            eyebrow="Brand Kit Generator"
            title="One colour in. A palette you can actually use out."
            lede="Ten steps built so the gaps look even to a human eye, each one telling you whether black or white text passes on it. Plus a type scale from a single base size. Copy the CSS and go."
          />
        </div>
      </Section>

      <Section band="cream" innerClassName="pt-0 md:pt-0">
        <div className="max-w-3xl">
          <BrandKit />
        </div>
      </Section>

      <Section band="sand">
        <SectionHeader
          eyebrow="Why the steps look right"
          title="Even numbers aren't even colours."
          lede="The usual way to build a ramp is to hold the hue and walk lightness in HSL. It's also why so many generated palettes have muddy middles: HSL's lightness isn't perceptual. Pure yellow and pure blue both sit at 50%, and one of them is blinding."
        />
        <div className="mt-10 max-w-2xl space-y-4 text-slate">
          <p>
            This builds the ramp in OKLCh instead, a space designed so equal
            steps in lightness look like equal steps. When a step would be too
            saturated for a screen to show, the saturation comes down rather than
            the channels being clipped — clipping is what shifts the hue and
            gives you a ramp that drifts from orange to brown.
          </p>
          <p>
            The contrast figures are measured, not estimated. The lightness
            targets and the line-height suggestions are opinions, and the tool
            says which is which rather than presenting all of it as fact.
          </p>
          <p>
            If you need the whole system — logo, type, the rules for using
            them — that&apos;s{" "}
            <MainSiteLink
              href={MAIN.service(tool.relatedService)}
              className="font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
            >
              brand &amp; design systems
            </MainSiteLink>{" "}
            work, and it starts with a conversation rather than a hex code.
          </p>
        </div>
      </Section>

      <Section band="cream">
        <div className="max-w-3xl">
          <FaqList items={faqs} heading="Common questions" />
        </div>
      </Section>

      <CtaBand
        eyebrow="Beyond the palette"
        title="Colours are the easy half."
        body="The hard half is a set of rules everyone actually follows, so the site, the invoice and the van all look like the same company."
      />
    </>
  );
}
