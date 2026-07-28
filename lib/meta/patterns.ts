/* Starting points, not suggestions.
 *
 * WHAT THIS IS NOT: an AI writer. There is no model behind this, no API key, no
 * per-use cost, and nothing typed here leaves the browser. That is a deliberate
 * choice rather than a limitation to apologise for — the brief's rule is no
 * fixed costs before revenue, and a generator that phones a paid API on every
 * keystroke is a bill that arrives whether or not anyone hires us.
 *
 * WHAT IT IS: four title shapes and two description shapes that are simply how
 * a page title is normally built — the specific thing first, the business name
 * last, because the front of the line is what survives truncation and what a
 * reader scans. Filling them in is a formatting job, and formatting is
 * something code can do honestly.
 *
 * The output is EDITABLE and is labelled on screen as a draft to start from.
 * A generated line that nobody edits is a generated line, and it reads like one.
 */

export type MetaInput = {
  /** What the page is actually about. "Emergency plumbing repairs". */
  subject: string;
  /** The business name. Goes last — the tail is what gets cut. */
  business: string;
  /** Optional town or area. Local intent is usually the whole search. */
  location: string;
};

export type Suggestion = {
  /** Why this shape, in one line. Shown next to the option — an unexplained
   *  list of near-identical strings is a coin toss, not a choice. */
  note: string;
  text: string;
};

const clean = (s: string) => s.trim().replace(/\s+/g, " ");

/** Sentence-case a fragment without mangling names already capitalised. */
function lead(s: string): string {
  const t = clean(s);
  if (!t) return t;
  return t[0]!.toUpperCase() + t.slice(1);
}

export function titleSuggestions({ subject, business, location }: MetaInput): Suggestion[] {
  const s = lead(subject);
  const b = clean(business);
  const l = clean(location);
  if (!s) return [];

  const out: Suggestion[] = [];

  if (l) {
    out.push({
      note: "Puts the place in the line. Usually the strongest for local searches.",
      text: b ? `${s} in ${l} | ${b}` : `${s} in ${l}`,
    });
  }

  out.push({
    note: "The plainest version. Hard to beat when the service name is the search.",
    text: b ? `${s} | ${b}` : s,
  });

  if (l) {
    out.push({
      note: "Front-loads the place. Worth testing when the town is competitive.",
      text: b ? `${l} ${s.toLowerCase()} | ${b}` : `${l} ${s.toLowerCase()}`,
    });
  }

  if (b) {
    out.push({
      note: "Business name first. Only worth it once people search for you by name.",
      text: `${b} — ${s}`,
    });
  }

  /* Two shapes can collapse into the same string when a field is blank. */
  return dedupe(out);
}

export function descriptionSuggestions({
  subject,
  business,
  location,
}: MetaInput): Suggestion[] {
  const s = clean(subject).toLowerCase();
  const b = clean(business);
  const l = clean(location);
  if (!s) return [];

  const who = b || "We";
  const where = l ? ` in ${l} and nearby` : "";

  return dedupe([
    {
      note: "Says what, where, and what to do next. The safe structure.",
      text: `${who} handle ${s}${where}. Tell us what's wrong and we'll tell you what it takes to fix it — no obligation.`,
    },
    {
      note: "Opens on the reader's problem instead of on you.",
      text: `Need ${s}${where}? ${who} will look at it, explain the options in plain English, and quote before any work starts.`,
    },
  ]);
}

function dedupe(list: Suggestion[]): Suggestion[] {
  const seen = new Set<string>();
  return list.filter((item) => {
    const key = item.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
