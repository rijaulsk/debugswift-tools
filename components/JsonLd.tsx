import { jsonLdScript } from "@/lib/seo";

/* Structured data, inlined.
 *
 * A <script type="application/ld+json"> is not executed, so this is not the
 * dangerouslySetInnerHTML risk it looks like — but the payload still goes
 * through jsonLdScript(), which escapes "<" so a stray "</script>" in an
 * editor-supplied string cannot close the tag early. */
export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }}
    />
  );
}
