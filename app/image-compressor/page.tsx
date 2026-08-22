import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import CtaBand from "@/components/CtaBand";
import FaqList from "@/components/FaqList";
import ImageCompressor from "@/components/ImageCompressor";
import JsonLd from "@/components/JsonLd";
import MainSiteLink from "@/components/MainSiteLink";
import { Section, SectionHeader } from "@/components/Section";
import ToolVisual from "@/components/ToolVisual";
import { canonicalPath, MAIN, TOOLS, toolUrl } from "@/lib/links";
import { toolBreadcrumbs, toolGraph } from "@/lib/seo";
import { getTool } from "@/lib/tools";
import type { FaqItem } from "@/lib/types";

/* Copy source: docs/copy/tools.md (DRAFT — not owner-approved). */

const tool = getTool("image-compressor")!;

export const metadata: Metadata = {
  title: "Free Image Compressor",
  description:
    "Shrink photos for your website without uploading them anywhere. Resize, re-encode to WebP or JPEG, and see the real before-and-after sizes. Free, no signup.",
  alternates: { canonical: canonicalPath("/image-compressor") },
  openGraph: {
    title: "Free Image Compressor — DebugSwift",
    description:
      "Shrink photos for the web without uploading them anywhere. Real before-and-after sizes.",
    url: toolUrl("/image-compressor"),
  },
};

const faqs: FaqItem[] = [
  {
    question: "Do my photos get uploaded?",
    answer:
      "No. The compressing happens inside this page — your browser decodes, resizes and re-encodes the file, and nothing is sent. The only network request the page makes is the same anonymous page-view counter as every other page on this site, and it happens whether or not you add an image.",
  },
  {
    question: "Why did one of my images get bigger?",
    answer:
      "Because it was already well compressed, and re-encoding an optimised file usually costs more than it saves. When that happens the tool says so on the row and gives you the original back rather than a worse version of it.",
  },
  {
    question: "What gets lost?",
    answer:
      "Quality, a little, because re-encoding is always lossy — so keep your originals; this is for the copy that goes on the site. All metadata goes too: EXIF, camera settings, the colour profile, any copyright field, and GPS coordinates. Losing the location out of a phone photo before it goes public is usually a win. Losing a colour profile can shift a wide-gamut photo slightly.",
  },
  {
    question: "WebP or JPEG?",
    answer:
      "WebP, unless something in your workflow refuses it. It's meaningfully smaller at the same visual quality and every current browser reads it. JPEG is there for older software and for anyone who needs maximum compatibility.",
  },
];

export default function ImageCompressorPage() {
  return (
    <>
      <JsonLd data={toolGraph(tool, faqs)} />

      <Section band="cream" innerClassName="pb-10 md:pb-16">
        <Breadcrumbs trail={toolBreadcrumbs(tool)} />
        <div className="mt-8 lg:grid lg:grid-cols-12 lg:items-start lg:gap-12">
          <div className="lg:col-span-7">
            <SectionHeader
              as="h1"
              eyebrow="Image Compressor"
              title="Photos are why the page is slow."
              lede="A camera photo is often three or four megabytes. On a website it needs to be a few dozen kilobytes. Drop them here and they're resized and re-encoded on your own device — nothing is uploaded."
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
          <ImageCompressor />
        </div>
      </Section>

      <Section band="sand">
        <SectionHeader
          eyebrow="Why it matters"
          title="The biggest thing on most pages is a photo nobody resized."
          lede="Not a framework, not a tracking script — a product shot straight off a phone at full resolution, being downloaded in full and then displayed four hundred pixels wide."
        />
        <div className="mt-10 max-w-2xl space-y-4 text-slate">
          <p>
            The fix is unglamorous: make it the size it actually gets displayed
            at, and encode it properly. That is most of what image optimisation
            is, and it costs nothing.
          </p>
          <p>
            If the{" "}
            <Link
              href={TOOLS.tool("website-audit")}
              className="font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
            >
              website audit
            </Link>{" "}
            flagged your page weight, this is usually the first thing to try. If
            the page is still slow once the images are sensible, the problem is
            further in — hosting, database queries, or too much script — and
            that&apos;s{" "}
            <MainSiteLink
              href={MAIN.service(tool.relatedService)}
              className="font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
            >
              development
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
        eyebrow="Still slow?"
        title="Compressing images is the first fix, not the only one."
        body="If the page still drags once the photos are sensible, something further in is the cause — and guessing at it is expensive."
      />
    </>
  );
}
