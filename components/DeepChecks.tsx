"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { variantClasses } from "@/components/Button";
import { API } from "@/lib/links";
import type { DeepChecks as DeepResult, DeepFailure } from "@/lib/audit/deep";

/* The deeper checks, on a button.
 *
 * THREE THINGS THIS COMPONENT EXISTS TO GET RIGHT.
 *
 * 1. The visitor decides. Our own 34 checks are one fetch from our server;
 *    these hand the address to Google, Mozilla and a registry. So the button
 *    says who, above the click, in the same size text as everything else — not
 *    in a footnote under it.
 *
 * 2. Nothing here counts towards the score. The audit's "31 of 33" is this
 *    tool's opinion of its own checks. A Lighthouse number folded into that
 *    would change the denominator silently and stop two audits being
 *    comparable. This renders as its own section, below, attributed.
 *
 * 3. Each source fails on its own. Google timing out must not discard a
 *    security grade that arrived in two seconds, and a missing result is
 *    always a stated failure rather than a blank or a zero — a 0/100 printed
 *    because a field was absent is the worst possible claim about someone's
 *    site, invented.
 *
 * The waiting copy is honest about the wait. Google really does take tens of
 * seconds, and a spinner that implies otherwise makes a working tool feel
 * broken. No fake progress theatre either — the repo's rule, and there is
 * nothing to report between "asked" and "answered". */

type State =
  | { phase: "idle" }
  | { phase: "working" }
  | { phase: "done"; result: DeepResult }
  | { phase: "failed"; error: string; hint?: string };

const failed = (v: { ok: boolean }): v is DeepFailure => !v.ok;

export default function DeepChecks({ host }: { host: string }) {
  const [state, setState] = useState<State>({ phase: "idle" });
  const resultRef = useRef<HTMLDivElement>(null);

  async function run() {
    setState({ phase: "working" });
    try {
      const response = await fetch(API.deep, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ host }),
      });
      const data = await response.json();
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
      setState({
        phase: "failed",
        error: "That request didn't get through.",
        hint: "Check your connection and try again.",
      });
    }
    requestAnimationFrame(() => resultRef.current?.focus());
  }

  return (
    <section className="mt-12 border-t-[1.5px] border-ink pt-8 print:hidden">
      <p className="text-eyebrow uppercase text-indigo-600">Deeper checks</p>
      <h3 className="mt-3 text-h3 font-medium text-ink">
        Three things we can&apos;t measure ourselves.
      </h3>
      <p className="mt-3 max-w-2xl text-slate">
        How fast the page really loads, measured by Google in a real browser;
        what Mozilla makes of your security headers; and how long the domain has
        existed. Running these sends{" "}
        <strong className="font-medium text-ink">
          the address you typed to Google, to Mozilla, and to the domain registry
        </strong>
        . Nothing about you goes with it, and none of it counts towards the score
        above.
      </p>

      {state.phase !== "done" && (
        <div className="mt-6">
          <button
            type="button"
            onClick={run}
            disabled={state.phase === "working"}
            className={`${variantClasses.secondary} disabled:opacity-60`}
          >
            {state.phase === "working" ? (
              <span className="inline-flex items-center gap-2">
                <Loader2
                  size={18}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="motion-safe:animate-spin"
                />
                Asking…
              </span>
            ) : (
              "Run the deeper checks"
            )}
          </button>
          <p className="mt-3 text-small text-slate">
            {state.phase === "working"
              ? "Google is loading the page in a real browser — this genuinely takes up to a minute."
              : "Takes up to a minute, mostly waiting on Google."}
          </p>
        </div>
      )}

      <div ref={resultRef} tabIndex={-1} className="outline-none">
        {state.phase === "failed" && (
          <div className="mt-6 rounded-card border-[1.5px] border-ink bg-paper p-6">
            <p className="font-medium text-clay-700">{state.error}</p>
            {state.hint && <p className="mt-2 text-small text-slate">{state.hint}</p>}
          </div>
        )}

        {state.phase === "done" && (
          <div className="mt-8 space-y-6">
            <Pagespeed result={state.result.pagespeed} />
            <Security result={state.result.security} />
            <Domain result={state.result.domain} />
          </div>
        )}
      </div>
    </section>
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
      <div className="mt-4">{children}</div>
    </div>
  );
}

/** A failure is a sentence, never a blank panel and never a zero. */
function Unavailable({ reason }: { reason: string }) {
  return <p className="text-small text-slate">{reason}</p>;
}

function Pagespeed({ result }: { result: DeepResult["pagespeed"] }) {
  return (
    <Panel source="Google PageSpeed Insights" title="Performance, on a phone">
      {failed(result) ? (
        <Unavailable reason={result.reason} />
      ) : (
        <>
          <p className="text-h1 font-bold tabular-nums text-ink">
            {result.score}
            <span className="ml-2 text-h3 font-medium text-slate">/ 100</span>
          </p>
          <p className="mt-2 max-w-2xl text-small text-slate">
            Google&apos;s Lighthouse score for the mobile version. It is a lab
            measurement on Google&apos;s hardware, not a reading of what your
            visitors experience — the field figures below are that, when Google
            has enough traffic to report them.
          </p>
          {result.metrics.length > 0 && (
            <dl className="mt-5 divide-y-[1.5px] divide-mist border-y-[1.5px] border-mist">
              {result.metrics.map((m) => (
                <div key={m.label} className="flex justify-between gap-6 py-3">
                  <dt className="text-small text-ink">{m.label}</dt>
                  <dd className="text-small tabular-nums text-slate">{m.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="mt-5">
            <p className="text-eyebrow uppercase text-indigo-600">
              From real visitors
            </p>
            {result.field ? (
              <dl className="mt-3 divide-y-[1.5px] divide-mist border-y-[1.5px] border-mist">
                {result.field.map((f) => (
                  <div key={f.label} className="flex justify-between gap-6 py-3">
                    <dt className="text-small text-ink">{f.label}</dt>
                    <dd className="text-small text-slate">{f.verdict}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 text-small text-slate">
                Google has no field data for this site — that means too few
                visitors in Chrome to report on, which is normal for a smaller
                site and is not a fault.
              </p>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}

function Security({ result }: { result: DeepResult["security"] }) {
  return (
    <Panel source="Mozilla HTTP Observatory" title="Security headers">
      {failed(result) ? (
        <Unavailable reason={result.reason} />
      ) : (
        <>
          <p className="text-h1 font-bold text-ink">{result.grade}</p>
          <p className="mt-2 max-w-2xl text-small text-slate">
            Mozilla&apos;s grade, from {result.passed} of {result.total} of their
            checks passing. These are the headers that tell a browser what your
            page is allowed to do — the kind of thing that costs nothing to add
            and is almost always simply missing.
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
          <p className="text-h1 font-bold tabular-nums text-ink">
            {result.ageYears}
            <span className="ml-2 text-h3 font-medium text-slate">
              {result.ageYears === 1 ? "year" : "years"}
            </span>
          </p>
          <p className="mt-2 max-w-2xl text-small text-slate">
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
