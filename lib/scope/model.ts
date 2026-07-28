/* The scope model.
 *
 * WHY THIS TOOL PRINTS NO PRICES, because it is the obvious question.
 *
 * The brief locks "no public pricing on the website" — pricing is per-proposal
 * after a diagnosis, and the rupee ranges that exist are recorded as INTERNAL
 * ANCHORS, NOT PUBLISHED. A calculator that printed a number would break that
 * decision and leak those anchors in the same move. So this works out SCOPE,
 * not cost, and the page says so in as many words.
 *
 * That is not a consolation prize. The reason a small business gets three
 * quotes that differ by 4× is almost never that one agency is greedy — it is
 * that all three were asked a different question, because nobody wrote down
 * what was actually wanted. A brief you can hand to three people unchanged is
 * worth more than a made-up number, and it is the thing this tool can produce
 * honestly.
 *
 * THE ONE KIND OF NUMBER IT DOES SHOW is build time, and it is arithmetic the
 * visitor performed: every item below carries an explicit `days` figure, the
 * page shows the per-item contribution, and the total is their sum. Those day
 * figures are a statement about how long WE would budget for that piece of
 * work — a claim about ourselves, like the Lead Engine's "7 days" — not a
 * statistic about the industry, and the page labels them that way. There is no
 * survey behind them and none is implied.
 */

export type ProjectKind = "website" | "ecommerce" | "webapp" | "automation";

export type Option = {
  id: string;
  label: string;
  /** Build days this adds. Shown to the visitor, never hidden in a total. */
  days: number;
  /** Why it costs what it costs, in one line. */
  note: string;
  /** Only offered for these project kinds. */
  kinds: ProjectKind[];
};

export const KINDS: { id: ProjectKind; label: string; blurb: string; baseDays: number }[] = [
  {
    id: "website",
    label: "A website",
    blurb: "Pages that explain what you do and get people to make contact.",
    baseDays: 8,
  },
  {
    id: "ecommerce",
    label: "An online shop",
    blurb: "Selling products directly, with a cart and payments.",
    baseDays: 14,
  },
  {
    id: "webapp",
    label: "A web app or portal",
    blurb: "Logins, dashboards, bookings — software rather than pages.",
    baseDays: 20,
  },
  {
    id: "automation",
    label: "Automation",
    blurb: "Wiring existing tools together so a manual job stops being manual.",
    baseDays: 6,
  },
];

const ALL: ProjectKind[] = ["website", "ecommerce", "webapp", "automation"];

export const OPTIONS: Option[] = [
  {
    id: "design",
    label: "You need the design done, not just the build",
    days: 5,
    note: "Working from an existing brand is faster than inventing one.",
    kinds: ALL,
  },
  {
    id: "copy",
    label: "You need the words written",
    days: 4,
    note: "The single most common reason a project stalls is waiting on content.",
    kinds: ALL,
  },
  {
    id: "pages",
    label: "More than about eight pages or templates",
    days: 4,
    note: "Page count matters less than how many distinct LAYOUTS there are.",
    kinds: ["website", "ecommerce"],
  },
  {
    id: "accounts",
    label: "Customers log in and have accounts",
    days: 6,
    note: "Accounts bring password resets, permissions and data protection with them.",
    kinds: ["website", "ecommerce", "webapp"],
  },
  {
    id: "payments",
    label: "Taking payments online",
    days: 4,
    note: "The gateway is quick; refunds, failures and receipts are the work.",
    kinds: ["website", "ecommerce", "webapp"],
  },
  {
    id: "integrations",
    label: "It has to talk to software you already use",
    days: 5,
    note: "Whether the other system has a decent API decides this one entirely.",
    kinds: ALL,
  },
  {
    id: "migration",
    label: "Existing data or content has to come across",
    days: 4,
    note: "Migration is boring, unavoidable, and routinely forgotten in quotes.",
    kinds: ALL,
  },
  {
    id: "multilingual",
    label: "More than one language",
    days: 4,
    note: "Doubles the content and complicates every URL.",
    kinds: ["website", "ecommerce"],
  },
  {
    id: "selfedit",
    label: "You want to edit it yourself afterwards",
    days: 4,
    note: "A CMS is worth it if you'll actually use it, and overhead if you won't.",
    kinds: ["website", "ecommerce", "webapp"],
  },
  {
    id: "seo",
    label: "It needs to be found in search",
    days: 3,
    note: "Structure and speed at build time; the ongoing work is separate.",
    kinds: ["website", "ecommerce"],
  },
];

export function optionsFor(kind: ProjectKind): Option[] {
  return OPTIONS.filter((o) => o.kinds.includes(kind));
}

export type Estimate = {
  baseDays: number;
  chosen: Option[];
  totalDays: number;
  /** A working range in weeks, at five working days to the week. Rounded
   *  outward — a range that looks precise is a range nobody should trust. */
  lowWeeks: number;
  highWeeks: number;
};

export function estimate(kind: ProjectKind, chosenIds: string[]): Estimate {
  const base = KINDS.find((k) => k.id === kind)!;
  const chosen = optionsFor(kind).filter((o) => chosenIds.includes(o.id));
  const totalDays = base.baseDays + chosen.reduce((sum, o) => sum + o.days, 0);

  /* ±25%, because a build estimate stated as a single figure is a promise
   * nobody can keep, and the honest form of "about six weeks" is "five to
   * eight". */
  return {
    baseDays: base.baseDays,
    chosen,
    totalDays,
    lowWeeks: Math.max(1, Math.floor((totalDays * 0.75) / 5)),
    highWeeks: Math.ceil((totalDays * 1.25) / 5),
  };
}

/** Things that change a quote and are almost never in the original ask. */
export const GOTCHAS: string[] = [
  "Who writes the words, and when they will be ready.",
  "Who supplies photographs, and whether they are licensed for your use.",
  "Whether an existing site's addresses need to keep working afterwards.",
  "What happens after launch — fixes, changes, hosting, and who pays for them.",
  "Who owns the code and the accounts when it is finished.",
];

/** The questions any competent agency will ask. Handing them the answers up
 *  front is what makes three quotes comparable. */
export const THEY_WILL_ASK: string[] = [
  "What does success look like six months after launch?",
  "What are you using now, and what specifically is wrong with it?",
  "Who inside your business will own this once it is live?",
  "Is there a date this has to be ready for, and what happens if it slips?",
  "What is the budget range you are working within?",
];

/** A plain-text brief, for pasting into an email to whoever is quoting. */
export function toBrief(kind: ProjectKind, chosenIds: string[]): string {
  const base = KINDS.find((k) => k.id === kind)!;
  const est = estimate(kind, chosenIds);
  const lines: string[] = [];

  lines.push(`PROJECT BRIEF`);
  lines.push(``);
  lines.push(`What we want: ${base.label} — ${base.blurb}`);
  lines.push(``);
  lines.push(`It needs to include:`);
  if (est.chosen.length === 0) {
    lines.push(`  (nothing beyond the basics yet — see the questions below)`);
  }
  for (const o of est.chosen) lines.push(`  - ${o.label}`);

  const notChosen = optionsFor(kind).filter((o) => !chosenIds.includes(o.id));
  if (notChosen.length) {
    lines.push(``);
    lines.push(`Explicitly NOT in scope:`);
    for (const o of notChosen) lines.push(`  - ${o.label}`);
  }

  lines.push(``);
  lines.push(`Please confirm in your quote:`);
  for (const g of GOTCHAS) lines.push(`  - ${g}`);

  lines.push(``);
  lines.push(`We can answer these:`);
  for (const q of THEY_WILL_ASK) lines.push(`  - ${q}`);

  lines.push(``);
  lines.push(
    `(Scope worked out with the free tool at https://debugswift.com/tools/project-scoper — no prices attached, it just writes down what was asked for.)`,
  );

  return lines.join("\n");
}
