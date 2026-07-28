import Button from "@/components/Button";
import CircuitPattern from "@/components/CircuitPattern";
import Eyebrow from "@/components/Eyebrow";

/* Shared final-CTA band. Carries the view's single clay element —
 * never place a second clay element in the same view.
 *
 * PORTED VERBATIM FROM E:\debugswift\components\CtaBand.tsx. The only change is
 * the Button href, which stays a MAIN-SITE path and therefore relies on Button's
 * `main` defaulting to true (a bare <a>) — under basePath "/tools", next/link
 * would send it to /tools/contact. See components/MainSiteLink.tsx. */
export default function CtaBand({
  title,
  body,
  eyebrow = "Start here",
}: {
  title: string;
  body?: string;
  eyebrow?: string;
}) {
  return (
    <section className="relative overflow-hidden border-t-[1.5px] border-mist bg-sand">
      <CircuitPattern opacity={0.08} />
      <div className="relative mx-auto w-full max-w-canvas px-6 pt-16 pb-16 text-center md:px-12 md:pt-28 md:pb-28 lg:text-left">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-3 max-w-3xl text-h2 mx-auto lg:mx-0">{title}</h2>
        {body && <p className="mt-5 max-w-2xl mx-auto lg:mx-0">{body}</p>}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-5 lg:justify-start">
          <Button variant="primary" href="/contact">
            Book a free diagnosis
          </Button>
          <span className="text-small text-slate">
            Twenty minutes. No pitch, no obligation.
          </span>
        </div>
        <p className="mt-4 text-small text-slate">
          Fixed price agreed before work starts. No hourly billing, no
          surprises.
        </p>
      </div>
    </section>
  );
}
