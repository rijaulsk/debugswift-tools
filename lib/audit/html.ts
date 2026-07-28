/* A very small HTML reader.
 *
 * No parser dependency, and that is a considered choice rather than
 * stubbornness (the repo rule is: no new dependency without stating why). What
 * this file needs is a fixed, shallow list of facts — the title, some meta
 * tags, how many h1s, which links exist. That is tag-shaped work, not
 * tree-shaped work: nothing here cares about nesting, and no check depends on
 * document order or on recovering from bad markup the way a browser would.
 *
 * The limits are real and worth knowing:
 *   - A tag inside a comment or a <script> string is invisible to a browser and
 *     visible to a regex. stripInert() removes the two containers that matter
 *     (script, style) and HTML comments before anything else runs.
 *   - Attribute values containing "<" or ">" inside quotes parse correctly;
 *     unquoted values containing spaces do not. Rare enough, and the failure is
 *     a missed attribute, not a wrong verdict.
 *
 * If a check ever needs real structure — "is this heading inside <main>" — that
 * is the moment to add a parser, not the moment to write a cleverer regex. */

export type MetaTag = {
  name?: string;
  property?: string;
  httpEquiv?: string;
  content?: string;
};

/** Parse the attributes of one tag string. */
export function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re =
    /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  /* Skip the tag name itself. */
  const body = tag.replace(/^<\s*[a-zA-Z][^\s/>]*/, "");
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const key = m[1]!.toLowerCase();
    const value = m[2] ?? m[3] ?? m[4] ?? "";
    if (!(key in out)) out[key] = decodeEntities(value);
  }
  return out;
}

/** The handful of entities that actually show up in titles and descriptions. */
export function decodeEntities(s: string): string {
  return s
    .replace(/&(#\d+|#x[0-9a-fA-F]+|amp|lt|gt|quot|apos|nbsp|#39);/g, (full, code: string) => {
      switch (code) {
        case "amp":
          return "&";
        case "lt":
          return "<";
        case "gt":
          return ">";
        case "quot":
          return '"';
        case "apos":
        case "#39":
          return "'";
        case "nbsp":
          return " ";
        default: {
          const num = code.startsWith("#x")
            ? parseInt(code.slice(2), 16)
            : parseInt(code.slice(1), 10);
          return Number.isFinite(num) ? String.fromCodePoint(num) : full;
        }
      }
    })
    .replace(/\s+/g, " ")
    .trim();
}

/** Remove comments, <script> and <style> bodies — the three places a "tag" can
 *  appear without being a tag. */
export function stripInert(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ");
}

/** Everything before </head>, or the first 200KB if there is no closing tag. */
export function headSection(html: string): string {
  const end = html.search(/<\/head\s*>/i);
  return end === -1 ? html.slice(0, 200_000) : html.slice(0, end);
}

export function getTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title\s*>/i);
  if (!m) return null;
  return decodeEntities(m[1]!.replace(/<[^>]*>/g, ""));
}

export function getMetas(html: string): MetaTag[] {
  const out: MetaTag[] = [];
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    out.push({
      name: a.name?.toLowerCase(),
      property: a.property?.toLowerCase(),
      httpEquiv: a["http-equiv"]?.toLowerCase(),
      content: a.content,
    });
  }
  return out;
}

export function metaContent(metas: MetaTag[], key: string): string | undefined {
  const lower = key.toLowerCase();
  const hit = metas.find((m) => m.name === lower || m.property === lower);
  return hit?.content?.trim() || undefined;
}

export function getLinkRels(html: string): { rel: string; href: string }[] {
  const out: { rel: string; href: string }[] = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    if (a.rel && a.href) {
      out.push({ rel: a.rel.toLowerCase(), href: a.href });
    }
  }
  return out;
}

export function countTag(html: string, tag: string): number {
  return [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "gi"))].length;
}

export function getHtmlLang(html: string): string | undefined {
  const m = html.match(/<html\b[^>]*>/i);
  if (!m) return undefined;
  return attrs(m[0]).lang?.trim() || undefined;
}

export function getImages(html: string): { src?: string; alt?: string }[] {
  return [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => {
    const a = attrs(m[0]);
    return {
      src: a.src,
      /* alt="" is a VALID, meaningful value — it marks an image as decorative.
       * The distinction that matters is present-vs-absent, so undefined and ""
       * must not be collapsed here. */
      alt: "alt" in a ? a.alt : undefined,
    };
  });
}

export function getAnchorHrefs(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = attrs(m[0]).href;
    if (href) out.push(href);
  }
  return out;
}

/** The @type values of every JSON-LD block, flattened (a block may be a graph
 *  or an array). Blocks that fail to parse are counted as invalid, which is
 *  itself a finding. */
export function getJsonLd(html: string): { types: string[]; invalid: number } {
  const types: string[] = [];
  let invalid = 0;

  for (const m of html.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi,
  )) {
    try {
      collectTypes(JSON.parse(m[1]!.trim()), types);
    } catch {
      invalid += 1;
    }
  }
  return { types: [...new Set(types)], invalid };
}

function collectTypes(node: unknown, into: string[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collectTypes(item, into);
    return;
  }
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const t = obj["@type"];
  if (typeof t === "string") into.push(t);
  if (Array.isArray(t)) for (const v of t) if (typeof v === "string") into.push(v);
  if (Array.isArray(obj["@graph"])) collectTypes(obj["@graph"], into);
}

/** Scripts in <head> with neither defer nor async nor type="module" — the ones
 *  that stop the browser building the page while they download. */
export function countBlockingScripts(head: string): number {
  let n = 0;
  for (const m of head.matchAll(/<script\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    if (!a.src) continue;
    if ("defer" in a || "async" in a) continue;
    if (a.type?.toLowerCase() === "module") continue;
    n += 1;
  }
  return n;
}
