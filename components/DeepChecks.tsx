"use client";

import { AlertTriangle, Check, ExternalLink, Loader2, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { API } from "@/lib/links";
import type { DeepChecks as DeepResult, DeepFailure, PagespeedResult } from "@/lib/audit/deep";

/* The deeper checks — Google, Mozilla and the domain registry.
 *
 * RUNS AUTOMATICALLY, no button. It used to sit behind one, on the reasoning
 * that PageSpeed takes ~19s against the audit's 815ms and that handing the
 * address to three other companies should be a choice. The owner's call was
 * that a second click makes it feel like a second tool.
 *
 * The way that is reconciled rather than simply overridden: this is still a
 * SEPARATE REQUEST. The audit renders the instant it returns, and this section
 * fills in underneath while Google works. One action for the visitor, no click,
 * and nobody watches a blank page for twenty seconds waiting on a result most
 * of which was ready immediately. Folding it into /api/audit would have meant
 * the whole report waiting on the slowest participant.
 *
 * The disclosure moved with it — it now sits above this section unconditionally
 * and in the audit form's own helper text, so it is read BEFORE the address is
 * submitted rather than before a second click. Naming who receives the address
 * is not optional just because the click went away.
 *
 * Nothing here enters the score. "31 of 33" is this tool's opinion of its own
 * checks; Google's numbers are Google's, captioned as Google's, in their own
 * section. */

type State =
  | { phase: "working" }
  | { phase: "done"; result: DeepResult }
  | { phase: "failed"; error: string; hint?: string };

const failed = (v: { ok: boolean }): v is DeepFailure => !v.ok;

/* Google's own banding — 90+ good, 50–89 needs work, under 50 poor — carried in
 * WORDS and in this app's existing verdict colours. Google paints these red,
 * amber and green; the token tables have no such pair in use here, and a report
 * with four poor scores would otherwise be four alarm-coloured blocks in one
 * view. Same reasoning as AuditReport, same vocabulary, so a reader who has
 * learned one has learned both. */
function band(score: number): { label: string; className: string; Icon: LucideIcon } {
  if (score >= 90) return { label: "Good", className: "text-indigo-600", Icon: Check };
  if (score >= 50) return { label: "Needs work", className: "text-ink", Icon: AlertTriangle };
  return { label: "Poor", className: "text-clay-700", Icon: X };
}

export default function DeepChecks({ host }: { host: string }) {
  const [state, setState] = useState<State>({ phase: "working" });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    let cancelled = false;
    (async () => {
      try {
        /* API.deep, not a literal — fetch knows nothing about basePath, and a
         * bare "/api/deep" would hit the marketing site. */
        const response = await fetch(API.deep, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ host }),
        });
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setState({
            phase: "failed",
            error: data?.error ?? "That didn't get through.",
            hint: data?.hint,
          });
        } else {
          setState({ phase: "done", result: data as DeepResult });
        }
      } catch {
        if (!cancelled) {
          setState({
            phase: "failed",
            error: "The deeper checks didn't get through.",
            hint: "Your own results above are unaffected.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [host]);

  return (
    <section className="mt-12 border-t-[1.5px] border-ink pt-8 print:hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className="text-eyebrow uppercase text-indigo-600">Deeper checks</p>
        {state.phase === "working" && (
          <p className="inline-flex items-center gap-2 text-small text-slate">
            <Loader2
              size={16}
              strokeWidth={1.5}
              aria-hidden="true"
              className="motion-safe:animate-spin"
            />
            Google is loading the page in a real browser — up to a minute.
          </p>
        )}
      </div>
      <h3 className="mt-3 text-h3 font-medium text-ink">
        Three things we can&apos;t measure ourselves.
      </h3>
      <p className="mt-3 max-w-2xl text-slate">
        Measured by Google in a real browser, graded by Mozilla, and dated by the
        domain registry. Running the audit sends{" "}
        <strong className="font-medium text-ink">
          the address you typed to those three
        </strong>
        . Nothing about you goes with it, and none of it counts towards the score
        above.
      </p>

      <div className="mt-8" aria-live="polite">
        {state.phase === "working" && <Skeleton />}

        {state.phase === "failed" && (
          <div className="rounded-card border-[1.5px] border-ink bg-paper p-6">
            <p className="font-medium text-clay-700">{state.error}</p>
            {state.hint && <p className="mt-2 text-small text-slate">{state.hint}</p>}
          </div>
        )}

        {state.phase === "done" && (
          <div className="space-y-6">
            <Pagespeed result={state.result.pagespeed} />
            <Security result={state.result.security} />
            <Domain result={state.result.domain} />
          </div>
        )}
      </div>
    </section>
  );
}

/* Placeholders at the real panel sizes, so the report does not jump when the
 * results land. No shimmer — this app's motion budget is 200ms hovers, and a
 * pulsing block for twenty seconds is the opposite of near-silent. */
function Skeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-card border-[1.5px] border-mist bg-paper p-6">
          <div className="h-3 w-40 rounded-full bg-mist" />
          <div className="mt-4 h-2 w-full max-w-md rounded-full bg-cream" />
          <div className="mt-3 h-2 w-2/3 max-w-sm rounded-full bg-cream" />
        </div>
      ))}
    </div>
  );
}

function Panel({
  source,
  title,
  children,
}: {
  source: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-card border-[1.5px] border-ink bg-paper p-6">
      <p className="text-eyebrow uppercase text-indigo-600">{source}</p>
      <p className="mt-2 font-medium text-ink">{title}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

/** A failure is a sentence, never a blank panel and never a zero. */
function Unavailable({ reason }: { reason: string }) {
  return <p className="text-small text-slate">{reason}</p>;
}

/** One category: the number, its band in words, and a bar on a shared 0–100
 *  track so four of them can be compared at a glance. */
function CategoryScore({ label, score }: { label: string; score: number }) {
  const { label: verdict, className, Icon } = band(score);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-small text-ink">{label}</span>
        <span className="text-small tabular-nums text-slate">{score}</span>
      </div>
      <span aria-hidden="true" className="mt-2 block h-2 overflow-hidden rounded-full bg-mist">
        <span
          className="block h-full rounded-full bg-indigo-600"
          style={{ width: `${score}%` }}
        />
      </span>
      <p className={`mt-2 inline-flex items-center gap-1.5 text-[13px] ${className}`}>
        <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
        {verdict}
      </p>
    </div>
  );
}

function Pagespeed({ result }: { result: DeepResult["pagespeed"] }) {
  return (
    <Panel source="Google PageSpeed Insights" title="Measured on a phone">
      {failed(result) ? (
        <Unavailable reason={result.reason} />
      ) : (
        <PagespeedBody result={result} />
      )}
    </Panel>
  );
}

function PagespeedBody({ result }: { result: PagespeedResult }) {
  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2">
        {result.scores.map((c) => (
          <CategoryScore key={c.id} label={c.label} score={c.score} />
        ))}
      </div>
      <p className="mt-6 max-w-2xl text-small text-slate">
        Google&apos;s own four Lighthouse scores for the mobile version, out of
        100 each. These are lab measurements on Google&apos;s hardware, not a
        reading of what your visitors experience — the field figures below are
        that, when Google has enough traffic to report them.
      </p>

      {result.opportunities.length > 0 && (
        <div className="mt-6 border-t-[1.5px] border-mist pt-5">
          <p className="text-eyebrow uppercase text-indigo-600">
            Biggest wins, largest first
          </p>
          <dl className="mt-3 divide-y-[1.5px] divide-mist border-y-[1.5px] border-mist">
            {result.opportunities.map((o) => (
              <div key={o.label} className="flex justify-between gap-6 py-3">
                <dt className="text-small text-ink">{o.label}</dt>
                <dd className="shrink-0 text-small tabular-nums text-slate">{o.saving}</dd>
              </div>
            ))}
          </dl>
          {/* NOT "the time each one would save". Google's displayValue for
            * these is whatever unit suits the audit — KiB for unused
            * JavaScript, seconds for a render-blocking request — while the
            * ordering below uses its millisecond estimate. Describing a figure
            * reading "27 KiB" as a time is the kind of small wrongness a
            * reader spots immediately and then distrusts the rest for. */}
          <p className="mt-3 text-small text-slate">
            Google&apos;s estimate of what each one would save, in whichever unit
            it measures that audit. Estimates, not promises — and ordered by how
            much load time each is costing, which is not always the same as the
            size shown.
          </p>
        </div>
      )}

      {result.metrics.length > 0 && (
        <div className="mt-6 border-t-[1.5px] border-mist pt-5">
          <p className="text-eyebrow uppercase text-indigo-600">What was measured</p>
          <dl className="mt-3 divide-y-[1.5px] divide-mist border-y-[1.5px] border-mist">
            {result.metrics.map((m) => (
              <div key={m.label} className="flex justify-between gap-6 py-3">
                <dt className="text-small text-ink">{m.label}</dt>
                <dd className="shrink-0 text-small tabular-nums text-slate">{m.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="mt-6 border-t-[1.5px] border-mist pt-5">
        <p className="text-eyebrow uppercase text-indigo-600">From real visitors</p>
        {result.field ? (
          <dl className="mt-3 divide-y-[1.5px] divide-mist border-y-[1.5px] border-mist">
            {result.field.map((f) => (
              <div key={f.label} className="flex justify-between gap-6 py-3">
                <dt className="text-small text-ink">{f.label}</dt>
                <dd className="shrink-0 text-small text-slate">{f.verdict}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-3 text-small text-slate">
            Google has no field data for this site — too few visitors in Chrome to
            report on, which is normal for a smaller site and is not a fault.
          </p>
        )}
      </div>
    </>
  );
}

function Security({ result }: { result: DeepResult["security"] }) {
  return (
    <Panel source="Mozilla HTTP Observatory" title="Security headers">
      {failed(result) ? (
        <Unavailable reason={result.reason} />
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p className="text-h1 font-bold text-ink">{result.grade}</p>
            <p className="text-small tabular-nums text-slate">
              {result.passed} of {result.total} checks passed
            </p>
          </div>
          <p className="mt-3 max-w-2xl text-small text-slate">
            Mozilla&apos;s grade. These are the headers that tell a browser what
            your page is allowed to do — the kind of thing that costs nothing to
            add and is almost always simply missing.
          </p>
          <p className="mt-4">
            <a
              href={result.detailsUrl}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 text-small font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline"
            >
              The full breakdown on Mozilla
              <ExternalLink size={14} strokeWidth={1.5} aria-hidden="true" />
            </a>
          </p>
        </>
      )}
    </Panel>
  );
}

function Domain({ result }: { result: DeepResult["domain"] }) {
  return (
    <Panel source="Domain registry" title="How long it has been around">
      {failed(result) ? (
        <Unavailable reason={result.reason} />
      ) : (
        <>
          <p className="text-h1 font-bold text-ink">
            {result.ageYears}
            <span className="ml-2 text-h3 font-medium text-slate">
              {result.ageYears === 1 ? "year" : "years"}
            </span>
          </p>
          <p className="mt-3 max-w-2xl text-small text-slate">
            Registered {result.registered}. Age is one of the few things about a
            domain that cannot be bought quickly, which is why it is worth
            knowing — but it is a fact, not a score, and a young domain is not a
            problem to fix.
          </p>
        </>
      )}
    </Panel>
  );
}
