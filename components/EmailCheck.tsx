"use client";

import { AlertTriangle, Check, HelpCircle, X, type LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { variantClasses } from "@/components/Button";
import { API } from "@/lib/links";
import { setParamsInUrl, useParam } from "@/lib/params";
import type { EmailReport, Finding, Verdict } from "@/lib/email/checks";

/* The deliverability checker.
 *
 * Same contract as AuditForm, for the same reason: a result renders only when
 * one is held. No optimistic state, no partial report, no "we couldn't reach
 * your DNS so here's what we'd normally check".
 *
 * THE VERDICT VOCABULARY IS THE AUDIT'S, deliberately reused rather than
 * reinvented — Indigo 600 for good, Ink for attention, Clay 700 for a problem,
 * Slate for unknown, each with an icon and a word. Two tools on one site that
 * mean different things by the same colour is worse than either choice on its
 * own. And, as there: no green and no red, because a report showing four
 * problems would otherwise put four alarm-coloured markers in a single view,
 * and colour-alone status fails the readers most likely to need this.
 *
 * `unknown` is a FIRST-CLASS verdict here in a way it is not in the audit, and
 * that is the point of the tool rather than a detail of it. A DNS lookup that
 * timed out and a DNS record that genuinely does not exist look identical from
 * the outside, and telling somebody their SPF is missing when ours simply
 * failed sends them to edit a zone that was already correct. */

type State =
  | { phase: "idle" }
  | { phase: "working" }
  | { phase: "done"; report: EmailReport }
  | { phase: "failed"; error: string; hint?: string };

const verdictIcon: Record<Verdict, LucideIcon> = {
  good: Check,
  attention: AlertTriangle,
  problem: X,
  unknown: HelpCircle,
};

const verdictClass: Record<Verdict, string> = {
  good: "text-indigo-600",
  attention: "text-ink",
  problem: "text-clay-700",
  unknown: "text-slate",
};

const verdictLabel: Record<Verdict, string> = {
  good: "Looks right",
  attention: "Worth a look",
  problem: "Needs fixing",
  unknown: "Couldn't tell",
};

export default function EmailCheck() {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [domain, setDomain] = useState("");
  const inputId = useId();
  const resultRef = useRef<HTMLDivElement>(null);

  /* ?domain= runs on load so a result is a link someone can send to whoever
   * manages their DNS — which is very often not the person who ran it. */
  const prefill = useParam("domain");
  const ran = useRef(false);
  useEffect(() => {
    if (!prefill || ran.current) return;
    ran.current = true;
    setDomain(prefill);
    void run(prefill, "");
  }, [prefill]);

  async function run(target: string, botcheck: string) {
    /* Claim the guard for EVERY run, not just the on-load one. The audit form
     * shipped a version that did not, and its own setParamsInUrl write
     * re-triggered the effect and fired a second identical check. */
    ran.current = true;
    setState({ phase: "working" });

    try {
      const response = await fetch(API.email, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain: target, botcheck }),
      });
      const data = await response.json();
      if (!response.ok) {
        setState({ phase: "failed", error: data?.error ?? "That didn't work.", hint: data?.hint });
      } else {
        setState({ phase: "done", report: data as EmailReport });
        setParamsInUrl({ domain: (data as EmailReport).domain });
      }
    } catch {
      setState({
        phase: "failed",
        error: "That request didn't get through.",
        hint: "Check your connection and try again.",
      });
    }
    requestAnimationFrame(() => resultRef.current?.focus());
  }

  const working = state.phase === "working";

  return (
    <div>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void run(String(form.get("domain") ?? ""), String(form.get("botcheck") ?? ""));
        }}
      >
        <label htmlFor={inputId} className="block font-medium text-ink">
          Which domain sends your email?
        </label>

        {/* Honeypot. "botcheck", never "website" — Chrome autofills a field
          * called that even with autoComplete off, which turns the trap into a
          * trap for real people. */}
        <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <label htmlFor={`${inputId}-botcheck`}>Leave this empty</label>
          <input id={`${inputId}-botcheck`} type="text" name="botcheck" tabIndex={-1} autoComplete="off" />
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id={inputId}
            name="domain"
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            disabled={working}
            placeholder="example.com"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-card border-[1.5px] border-ink bg-paper px-5 py-3 text-ink placeholder:text-slate disabled:opacity-60 sm:flex-1"
          />
          <button type="submit" disabled={working} className={`${variantClasses.primary} disabled:opacity-60`}>
            {working ? "Checking…" : "Check the records"}
          </button>
        </div>
        <p className="mt-3 text-small text-slate">
          The domain on its own, or an email address at it. We read public DNS
          records — nothing is sent, and no mailbox is touched.
        </p>
      </form>

      <div ref={resultRef} tabIndex={-1} className="outline-none">
        {state.phase === "failed" && (
          <div className="mt-8 rounded-card border-[1.5px] border-ink bg-paper p-6">
            <p className="font-medium text-clay-700">{state.error}</p>
            {state.hint && <p className="mt-2 text-small text-slate">{state.hint}</p>}
          </div>
        )}

        {state.phase === "done" && <Report report={state.report} />}
      </div>
    </div>
  );
}

function Report({ report }: { report: EmailReport }) {
  const problems = report.findings.filter((f) => f.verdict === "problem").length;

  return (
    <div className="mt-10">
      <div className="border-b-[1.5px] border-ink pb-8">
        <p className="text-eyebrow uppercase text-indigo-600">The result</p>
        {/* Proportional figures on a display number; tabular-nums is for
          * columns that align. */}
        <p className="mt-3 text-h1 font-bold text-ink">
          {problems === 0 ? "Nothing broken" : `${problems} to fix`}
        </p>
        <p className="mt-4 max-w-2xl text-small text-slate">
          Four records decide whether your email arrives. This is what{" "}
          <span className="text-ink">{report.domain}</span> publishes right now —
          read from public DNS, the same way a receiving mail server reads it.
          There is no score here on purpose: deliverability isn&apos;t a number.
        </p>
      </div>

      {report.spfLookups && <LookupBudget budget={report.spfLookups} />}

      <ul className="mt-2 divide-y-[1.5px] divide-mist border-y-[1.5px] border-mist">
        {report.findings.map((finding) => (
          <FindingRow key={finding.id} finding={finding} />
        ))}
      </ul>
    </div>
  );
}

/* The SPF lookup budget, as the same bar the audit's group breakdown uses:
 * Indigo 600 on a Mist track, value outside the bar, one series one colour.
 * Over the limit it is Clay 700 — the one place a bar changes colour, because
 * there the length has stopped meaning "progress" and started meaning "past a
 * hard cliff that invalidates the record". */
function LookupBudget({ budget }: { budget: NonNullable<EmailReport["spfLookups"]> }) {
  const over = budget.used > budget.limit;
  const pct = Math.min((budget.used / budget.limit) * 100, 100);
  return (
    <div className="mt-8">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-eyebrow uppercase text-indigo-600">SPF lookup budget</p>
        <p className="text-small tabular-nums text-slate">
          {budget.capped ? "over 10" : budget.used} of {budget.limit}
        </p>
      </div>
      <span aria-hidden="true" className="mt-3 block h-2 overflow-hidden rounded-full bg-mist">
        <span
          className={`block h-full rounded-full ${over ? "bg-clay-700" : "bg-indigo-600"}`}
          style={{ width: `${pct}%` }}
        />
      </span>
      <p className="mt-3 max-w-2xl text-small text-slate">
        Counted through your providers&apos; records as well as your own, which
        is where the count usually goes wrong.
      </p>
    </div>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  const Icon = verdictIcon[finding.verdict];
  return (
    <li className="py-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Icon
          size={20}
          strokeWidth={1.5}
          aria-hidden="true"
          className={`shrink-0 translate-y-[3px] ${verdictClass[finding.verdict]}`}
        />
        <span className="font-medium text-ink">{finding.label}</span>
        <span className={`text-eyebrow uppercase ${verdictClass[finding.verdict]}`}>
          {verdictLabel[finding.verdict]}
        </span>
      </div>
      <p className="mt-2 break-words text-slate">{finding.found}</p>
      <p className="mt-1 text-small text-slate">{finding.why}</p>
      {finding.record && (
        /* The raw record, verbatim and wrapping, so it can be compared
         * character by character with what's in the DNS zone. */
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-card border-[1.5px] border-mist bg-cream p-3 text-[13px] text-ink">
          {finding.record}
        </pre>
      )}
      {finding.fix && (
        <p className="mt-3 border-l-[1.5px] border-mist pl-4 text-small text-slate">
          <span className="font-medium text-ink">What to do: </span>
          {finding.fix}
        </p>
      )}
    </li>
  );
}
