import { mx, txt, type Lookup } from "@/lib/email/dns";

/* SPF, DKIM, DMARC and MX — the four records that decide whether the invoice
 * you just sent lands in an inbox or a spam folder.
 *
 * WHY THIS TOOL EXISTS. A small business almost never finds out about this.
 * There is no bounce, no error, no dashboard — mail simply stops arriving and
 * the customer says they never got it. It is the most expensive invisible
 * problem on the list, and it is diagnosable entirely from public DNS records
 * for nothing.
 *
 * THE DIFFERENTIATOR, and the reason this is worth building rather than
 * linking to a free checker: SPF has a hard limit of TEN DNS lookups, counted
 * across the WHOLE include tree, and exceeding it invalidates the record
 * outright. Most free tools count only the includes written in your own record
 * and report "8, fine" for a record that actually resolves to nineteen — the
 * failure is inside somebody else's include, one or two levels down. This
 * follows the tree.
 *
 * WHAT THIS TOOL WILL NOT DO. It will not give a letter grade or a score out
 * of a hundred. Deliverability is not a number, and the useful output is
 * "this specific record says this specific thing, and here is what to change".
 * Nor will it claim DKIM is missing — see the note on that below, which is the
 * most important honesty constraint in the file.
 */

export type Verdict = "good" | "attention" | "problem" | "unknown";

export type Finding = {
  id: string;
  label: string;
  verdict: Verdict;
  /** What was actually found. Always a statement of fact. */
  found: string;
  /** Why it matters, in the owner's terms rather than a protocol's. */
  why: string;
  /** Only when there is something concrete to change. */
  fix?: string;
  /** The raw record, shown verbatim so it can be compared with the DNS zone. */
  record?: string;
};

export type EmailReport = {
  domain: string;
  findings: Finding[];
  /** SPF's DNS-lookup budget, when we could compute it. */
  spfLookups: { used: number; limit: 10; capped: boolean } | null;
};

/* ------------------------------------------------------------------ helpers */

/** A lookup we could not complete becomes an `unknown` finding, never a
 *  negative one. See the three-outcome note in lib/email/dns.ts. */
function unknownFinding(id: string, label: string, why: string, detail: string): Finding {
  return {
    id,
    label,
    verdict: "unknown",
    found: `We couldn't check this — ${detail}.`,
    why,
    fix: "Worth running again in a moment. This is about our lookup, not your domain.",
  };
}

/* --------------------------------------------------------------------- spf */

const LOOKUP_MECHANISMS = ["include:", "a:", "mx:", "ptr:", "exists:", "redirect="];

/** Mechanisms that cost a DNS lookup even with no argument. */
const BARE_LOOKUP = new Set(["a", "mx", "ptr"]);

type SpfCount = { used: number; capped: boolean };

/**
 * Count SPF's DNS lookups across the whole include tree.
 *
 * The limit is ten, it is evaluated recursively, and blowing it makes the
 * record a permerror — which most receivers treat as no SPF at all. Counting
 * only the top level, as most free checkers do, misses exactly the case that
 * breaks people: an include that itself includes three more.
 *
 * Bounded deliberately. `seen` stops an include loop (they exist in the wild,
 * usually by accident); the budget stops us making sixty DNS queries to tell
 * someone a number that is already over the limit — once it is past ten the
 * answer is the same whether it is eleven or forty.
 */
async function countSpfLookups(
  record: string,
  seen: Set<string>,
  budget: { left: number },
): Promise<SpfCount> {
  let used = 0;
  let capped = false;

  for (const term of record.split(/\s+/)) {
    const bare = term.replace(/^[+\-~?]/, "");
    const lower = bare.toLowerCase();

    const costs =
      LOOKUP_MECHANISMS.some((m) => lower.startsWith(m)) || BARE_LOOKUP.has(lower);
    if (!costs) continue;

    used += 1;
    if (budget.left-- <= 0) {
      capped = true;
      break;
    }

    /* Only include: and redirect= expand into another record to count. a:, mx:,
     * ptr: and exists: each cost one lookup and stop there. */
    const nested = lower.startsWith("include:")
      ? bare.slice("include:".length)
      : lower.startsWith("redirect=")
        ? bare.slice("redirect=".length)
        : null;
    if (!nested || seen.has(nested)) continue;
    seen.add(nested);

    const child = await txt(nested);
    if (child.state !== "found") continue;
    const childSpf = child.records.find((r) => r.toLowerCase().startsWith("v=spf1"));
    if (!childSpf) continue;

    const sub = await countSpfLookups(childSpf, seen, budget);
    used += sub.used;
    if (sub.capped) {
      capped = true;
      break;
    }
  }

  return { used, capped };
}

async function checkSpf(
  domain: string,
): Promise<{ findings: Finding[]; lookups: EmailReport["spfLookups"] }> {
  const result = await txt(domain);

  if (result.state === "unknown") {
    return {
      findings: [
        unknownFinding(
          "spf",
          "SPF record",
          "SPF is the list of servers allowed to send email using your domain name.",
          result.why,
        ),
      ],
      lookups: null,
    };
  }

  const records =
    result.state === "found"
      ? result.records.filter((r) => r.toLowerCase().startsWith("v=spf1"))
      : [];

  if (records.length === 0) {
    return {
      findings: [
        {
          id: "spf",
          label: "SPF record",
          verdict: "problem",
          found: "No SPF record published.",
          why: "Without one, anybody can send email that claims to come from your domain, and receivers have nothing to check yours against. It is the single most common reason a small business's mail lands in spam.",
          fix: "Publish a TXT record on your domain starting v=spf1, listing whoever sends on your behalf, and ending in ~all.",
        },
      ],
      lookups: null,
    };
  }

  if (records.length > 1) {
    return {
      findings: [
        {
          id: "spf",
          label: "SPF record",
          verdict: "problem",
          found: `${records.length} SPF records published. There must be exactly one.`,
          why: "More than one SPF record is invalid, and receivers treat the whole thing as broken rather than picking one. This usually happens when a second provider is added and publishes its own record instead of joining the existing one.",
          fix: "Merge them into a single record: keep one v=spf1, combine the include: terms from both, and delete the other record.",
          record: records.join("   ⏎   "),
        },
      ],
      lookups: null,
    };
  }

  const record = records[0]!;
  const findings: Finding[] = [];

  /* The `all` qualifier is what the record DOES. Everything before it is a
   * list; this is the instruction. */
  const all = /([+\-~?])?all\b/i.exec(record);
  const qualifier = all?.[1] ?? "+";

  if (!all) {
    findings.push({
      id: "spf",
      label: "SPF record",
      verdict: "attention",
      found: "An SPF record exists, but it doesn't end with an `all` term.",
      why: "The `all` term is what tells a receiver how to treat mail from anywhere not on your list. Without it the record lists servers and then declines to say what it means.",
      fix: "End the record with ~all, or -all once you are confident the list is complete.",
      record,
    });
  } else if (qualifier === "+") {
    findings.push({
      id: "spf",
      label: "SPF record",
      verdict: "problem",
      found: "The record ends in +all, which authorises the entire internet.",
      why: "+all tells receivers that any server may send as your domain. It is worse than having no SPF at all, because it looks deliberate.",
      fix: "Change +all to ~all, or -all once you are confident the list is complete.",
      record,
    });
  } else {
    findings.push({
      id: "spf",
      label: "SPF record",
      verdict: "good",
      found: `An SPF record is published, ending in ${qualifier}all.`,
      why: "This is the list of servers allowed to send email using your domain name, and the ending says what to do about everyone else.",
      record,
    });
  }

  /* The lookup budget, counted across the whole tree. */
  const budget = { left: 30 };
  const count = await countSpfLookups(record, new Set([domain]), budget);

  if (count.used > 10) {
    findings.push({
      id: "spf-lookups",
      label: "SPF lookup limit",
      verdict: "problem",
      found: `The record needs ${count.capped ? "more than 10" : count.used} DNS lookups. The limit is 10.`,
      why: "Over ten, the record is invalid and most receivers treat it as though you had no SPF at all — even though it looks perfectly fine in your DNS. The count includes lookups inside your providers' own records, which is why this usually surprises people.",
      fix: "Remove providers you no longer send through, or ask your email provider whether they publish a flattened record.",
    });
  } else {
    findings.push({
      id: "spf-lookups",
      label: "SPF lookup limit",
      verdict: count.used >= 8 ? "attention" : "good",
      found: `The record needs ${count.used} of the 10 permitted DNS lookups.`,
      why:
        count.used >= 8
          ? "This is close to the limit. Adding one more sending service could push it over, at which point the record stops working entirely."
          : "Comfortably inside the limit. Counted through your providers' records too, not just your own.",
    });
  }

  return {
    findings,
    lookups: { used: count.used, limit: 10, capped: count.capped },
  };
}

/* ------------------------------------------------------------------- dmarc */

async function checkDmarc(domain: string): Promise<Finding> {
  const result = await txt(`_dmarc.${domain}`);

  if (result.state === "unknown") {
    return unknownFinding(
      "dmarc",
      "DMARC record",
      "DMARC tells receivers what to do when a message fails your other checks, and asks them to report back.",
      result.why,
    );
  }

  const record =
    result.state === "found"
      ? result.records.find((r) => r.toLowerCase().startsWith("v=dmarc1"))
      : undefined;

  if (!record) {
    return {
      id: "dmarc",
      label: "DMARC record",
      verdict: "problem",
      found: "No DMARC record published.",
      why: "DMARC is what turns SPF from a published opinion into an enforced rule, and it is the only way to find out that somebody is sending mail as you. Google and Yahoo now require it for anyone sending in bulk.",
      fix: "Publish a TXT record at _dmarc.your-domain starting v=DMARC1; p=none; rua=mailto:you@your-domain — p=none changes nothing on day one and starts the reports.",
    };
  }

  const policy = /\bp\s*=\s*(none|quarantine|reject)\b/i.exec(record)?.[1]?.toLowerCase();
  const hasReporting = /\brua\s*=\s*mailto:/i.test(record);

  if (policy === "none") {
    return {
      id: "dmarc",
      label: "DMARC record",
      verdict: "attention",
      found: `A DMARC record is published with p=none${hasReporting ? " and a reporting address" : ", and no reporting address"}.`,
      why: "p=none is monitoring only — it asks receivers to report, but tells them to deliver failing mail anyway. That is the correct place to start and the wrong place to stop.",
      fix: hasReporting
        ? "Once the reports show only your own servers sending, move to p=quarantine."
        : "Add rua=mailto:you@your-domain so the reports have somewhere to go — without it, p=none does nothing at all.",
      record,
    };
  }

  if (policy === "quarantine" || policy === "reject") {
    return {
      id: "dmarc",
      label: "DMARC record",
      verdict: "good",
      found: `A DMARC record is published with p=${policy}.`,
      why: "This is enforced rather than advisory: mail that fails your checks gets sent to spam or refused outright.",
      record,
    };
  }

  return {
    id: "dmarc",
    label: "DMARC record",
    verdict: "attention",
    found: "A DMARC record exists but has no readable policy.",
    why: "Without a p= term the record does not say what receivers should do, so it has no effect.",
    fix: "Add p=none to start, then tighten it once the reports look clean.",
    record,
  };
}

/* -------------------------------------------------------------------- dkim */

/* Common publisher selectors. Probing these is the ONLY way to look for DKIM
 * without being told the selector, and it is guesswork — which is why the
 * finding below never says DKIM is missing. */
const SELECTORS = [
  ["google", "Google Workspace"],
  ["selector1", "Microsoft 365"],
  ["selector2", "Microsoft 365"],
  ["k1", "Mailchimp"],
  ["k2", "Mailchimp"],
  ["s1", "a common default"],
  ["s2", "a common default"],
  ["default", "a common default"],
  ["dkim", "a common default"],
  ["mail", "a common default"],
  ["zoho", "Zoho"],
  ["fd", "SendGrid or similar"],
] as const;

/**
 * DKIM — and the honesty constraint that shapes the whole finding.
 *
 * DKIM keys live at <selector>._domainkey.<domain>, and the selector is chosen
 * by whoever sends your mail. There is no way to enumerate them: DNS will not
 * list what is under a name. So a checker can only guess at known selectors.
 *
 * WHICH MEANS NOT FINDING ONE PROVES NOTHING. A domain with perfectly good DKIM
 * on a selector we did not guess is indistinguishable, from out here, from a
 * domain with none. Reporting that as "DKIM missing" would send someone to fix
 * something that is not broken — so this reports a positive as a fact and a
 * negative as ignorance, in those words. That is the whole reason this finding
 * has an `unknown` verdict available to it and uses it.
 */
async function checkDkim(domain: string): Promise<Finding> {
  const hits: string[] = [];
  for (const [selector, provider] of SELECTORS) {
    const result = await txt(`${selector}._domainkey.${domain}`);
    if (result.state === "found" && result.records.some((r) => /v=DKIM1|p=/i.test(r))) {
      hits.push(`${selector} (${provider})`);
    }
  }

  if (hits.length > 0) {
    return {
      id: "dkim",
      label: "DKIM signing",
      verdict: "good",
      found: `Found DKIM keys published at: ${hits.join(", ")}.`,
      why: "DKIM signs each message so a receiver can prove it was not altered and really came from you. It is the check that survives forwarding, which SPF does not.",
    };
  }

  return {
    id: "dkim",
    label: "DKIM signing",
    verdict: "unknown",
    found: "No DKIM key found at any of the selectors we know to try.",
    why: "DKIM keys are published under a name your email provider chooses, and DNS gives no way to list them. We tried the dozen selectors the big providers use.",
    fix: "This does NOT mean you have no DKIM — only that it isn't on a name we can guess. Ask your email provider which selector they use, or check whether DKIM is switched on in their admin settings.",
  };
}

/* ---------------------------------------------------------------------- mx */

async function checkMx(domain: string): Promise<Finding> {
  const result = await mx(domain);

  if (result.state === "unknown") {
    return unknownFinding(
      "mx",
      "Mail servers",
      "MX records are where other people's mail servers deliver email addressed to you.",
      result.why,
    );
  }

  if (result.state === "absent") {
    return {
      id: "mx",
      label: "Mail servers",
      verdict: "attention",
      found: "No MX records published, so this domain doesn't receive email.",
      why: "That is fine if you deliberately don't take mail here. If you expect to receive email at this domain, nothing sent to it is arriving.",
      fix: "If you do want email at this domain, add the MX records your provider gives you.",
    };
  }

  const sorted = [...result.records].sort((a, b) => a.priority - b.priority);
  return {
    id: "mx",
    label: "Mail servers",
    verdict: "good",
    found: `${sorted.length} mail server${sorted.length === 1 ? "" : "s"} published — ${sorted.map((r) => r.exchange).join(", ")}.`,
    why: "This is where email addressed to your domain gets delivered.",
  };
}

/* ---------------------------------------------------------------- assembly */

export async function checkEmail(domain: string): Promise<EmailReport> {
  const [spf, dmarc, dkim, mxFinding] = await Promise.all([
    checkSpf(domain),
    checkDmarc(domain),
    checkDkim(domain),
    checkMx(domain),
  ]);

  return {
    domain,
    findings: [...spf.findings, dmarc, dkim, mxFinding],
    spfLookups: spf.lookups,
  };
}

/** Re-exported so the route can validate before doing any work. */
export type { Lookup };
