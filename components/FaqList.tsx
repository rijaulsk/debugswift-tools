import type { FaqItem } from "@/lib/types";

/* The FAQ accordion, in one place.
 *
 * It exists as a component because FAQ content appears in three places — a
 * faqBlock inside a post body, a post's closing `faqs` array, and the
 * write-for-us page — and the first two BOTH feed the FAQPage structured data
 * that lib/seo.ts emits. Google's guidance is that FAQ markup must describe
 * questions the reader can actually see; markup for answers that aren't on the
 * page is grounds for the rich result being dropped.
 *
 * That is not hypothetical here. The post's `faqs` array was compiled into
 * JSON-LD and never rendered, so the page advertised five questions and showed
 * two. One component, used by every caller, is what stops the two drifting
 * apart again.
 *
 * Native <details>, no client JavaScript: an accordion whose answers only exist
 * after hydration is an accordion whose answers a crawler may never read. */
export default function FaqList({
  items,
  heading = "Common questions",
  headingId,
}: {
  items: FaqItem[];
  heading?: string;
  /** Set when the surrounding section needs to be labelled by this heading. */
  headingId?: string;
}) {
  if (!items.length) return null;

  return (
    <div>
      <p id={headingId} className="text-eyebrow uppercase text-indigo-600">
        {heading}
      </p>
      <div className="mt-4 divide-y-[1.5px] divide-mist border-y-[1.5px] border-mist">
        {items.map((item) => (
          <details key={item.question} className="group py-4">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-medium text-ink marker:hidden">
              {item.question}
              <span
                aria-hidden="true"
                className="mt-1 shrink-0 text-indigo-600 transition-transform duration-200 ease-out group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-slate">{item.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
