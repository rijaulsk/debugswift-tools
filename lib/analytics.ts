/* Conversion instrumentation — same contract as the main site's lib/analytics.ts.
 *
 * Event names are an API: renaming one orphans its history in the Vercel
 * dashboard. The blog adds its own events for the surfaces the main site
 * doesn't have (subscribe, guest pitch, share), and keeps cta_click and
 * whatsapp_click identical so a click from a post and a click from a service
 * page land in the same bucket.
 */

export type ConversionEvent =
  /** Any "Book a free diagnosis" style click. */
  | "cta_click"
  /** Any outbound wa.me click. */
  | "whatsapp_click"
  /** Email capture succeeded — the request was accepted, not merely sent. */
  | "subscribe_submit"
  /** Email capture failed. Watch this one: a silent failure is a lost reader. */
  | "subscribe_error"
  /** A guest pitch was accepted by the API. */
  | "pitch_submit"
  /** A guest pitch failed to send. */
  | "pitch_error"
  /** A guest draft was accepted against a valid invite token. */
  | "draft_submit"
  /** A post was shared to a named network, or its link copied. */
  | "post_share";

export type EventProps = {
  /** Where the element lives, e.g. "post:footer", "write-for-us:form". */
  location: string;
  /** Free-form detail: the post slug, the network name, the button label. */
  label?: string;
  /** Numeric payload. */
  value?: number;
};

/**
 * Fire a conversion event. Safe to call from anywhere in the browser: if the
 * analytics script hasn't loaded (ad-blocker, offline, dev), this is a no-op
 * and MUST never throw — an analytics failure must not break a form submit.
 */
export async function track(event: ConversionEvent, props: EventProps) {
  if (typeof window === "undefined") return;
  try {
    const { track: vercelTrack } = await import("@vercel/analytics");
    vercelTrack(event, { ...props });
  } catch {
    /* Measurement is never allowed to take the conversion down with it. */
  }
}
