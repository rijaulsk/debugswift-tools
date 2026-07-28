import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import CtaBand from "@/components/CtaBand";
import FaqList from "@/components/FaqList";
import JsonLd from "@/components/JsonLd";
import MainSiteLink from "@/components/MainSiteLink";
import QrGenerator from "@/components/QrGenerator";
import { Section, SectionHeader } from "@/components/Section";
import { canonicalPath, MAIN, toolUrl } from "@/lib/links";
import { toolBreadcrumbs, toolGraph } from "@/lib/seo";
import { getTool } from "@/lib/tools";
import type { FaqItem } from "@/lib/types";

/* Copy source: docs/copy/tools.md (DRAFT — not owner-approved). */

const tool = getTool("qr-generator")!;

export const metadata: Metadata = {
  title: "Free QR Code Generator",
  description:
    "Make a QR code for a link, phone number or WhatsApp chat and download it as a vector SVG that stays sharp at any print size. Free, no signup, no tracking redirect.",
  alternates: { canonical: canonicalPath("/qr-generator") },
  openGraph: {
    title: "Free QR Code Generator — DebugSwift",
    description:
      "Vector QR codes that stay sharp in print. No signup, and the code points straight at your link.",
    url: toolUrl("/qr-generator"),
  },
};

const faqs: FaqItem[] = [
  {
    question: "Will the code stop working later?",
    answer:
      "No, and this is the one to check before using any QR generator. Plenty of free sites encode a link to their own domain that redirects to yours, so they can count scans — and if they change their pricing or shut down, every code you printed dies. Ours encodes your address directly. There's nothing in the middle, which also means we cannot tell you how many people scanned it.",
  },
  {
    question: "SVG or PNG?",
    answer:
      "SVG whenever the software will take it. It's vector, so it's sharp whether the code ends up two centimetres wide on a card or two metres on a van. The PNG is there for the software that still won't accept an SVG; it's 1024px, which is enough for a few inches at print resolution.",
  },
  {
    question: "Which error-correction level should I pick?",
    answer:
      "Medium for most printing. Higher levels let the code survive scratches and dirt, but they pack in more modules, so on a small print each module gets tinier and it can end up harder to scan rather than easier. Go high for outdoor or industrial surfaces, low only for screens.",
  },
  {
    question: "Why is there a white border around it?",
    answer:
      "That's the quiet zone, and scanners genuinely need it to find the code. Cropping it off is the single most common reason a printed QR won't read. Keep it, and keep good contrast — dark code on a light background, never the other way round.",
  },
];

export default function QrGeneratorPage() {
  return (
    <>
      <JsonLd data={toolGraph(tool, faqs)} />

      <Section band="cream" innerClassName="pb-10 md:pb-16">
        <Breadcrumbs trail={toolBreadcrumbs(tool)} />
        <div className="mt-8">
          <SectionHeader
            as="h1"
            eyebrow="QR Code Generator"
            title="A QR code that still works in five years."
            lede="It encodes your link directly — no redirect through us, nothing to expire, nothing to start charging for. Download it as vector so it stays sharp from a business card to a shopfront."
          />
        </div>
      </Section>

      <Section band="cream" innerClassName="pt-0 md:pt-0">
        <div className="max-w-3xl">
          <QrGenerator />
        </div>
      </Section>

      <Section band="sand">
        <SectionHeader
          eyebrow="The catch other tools have"
          title="Most free QR codes point at someone else's website."
          lede="They encode a short link on their own domain that forwards to yours, which is how they offer scan counts. It also means your printed code depends on their company still existing, and still being free."
        />
        <div className="mt-10 max-w-2xl space-y-4 text-slate">
          <p>
            This one puts your address in the code itself. The honest trade is
            that we can&apos;t report how many people scanned it — nothing routes
            through us, so there is nothing to count. If you need scan numbers,
            use a link you control with its own analytics, and encode that.
          </p>
          <p>
            One habit worth keeping regardless of which tool you use:{" "}
            <span className="text-ink">scan the proof before it goes to print.</span>{" "}
            A code is cheap to fix on screen and expensive to fix on five hundred
            flyers.
          </p>
          <p>
            If the QR is meant to start a conversation rather than just open a
            page, the thing on the other end matters more than the code —
            that&apos;s{" "}
            <MainSiteLink
              href={MAIN.service(tool.relatedService)}
              className="font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
            >
              conversion website
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
        eyebrow="After the scan"
        title="The code is the easy bit."
        body="What happens in the ten seconds after someone scans it is what decides whether you hear from them."
      />
    </>
  );
}
