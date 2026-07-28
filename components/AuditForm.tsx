"use client";

import { useId, useRef, useState } from "react";
import AuditReport from "@/components/AuditReport";
import { variantClasses } from "@/components/Button";
import { API } from "@/lib/links";
import { isAuditError, type AuditError, type AuditResult } from "@/lib/audit/types";

/* The audit form.
 *
 * THE HONESTY CONTRACT, which is the only part of this file worth arguing
 * about: this component renders a result only when it holds one. There is no
 * optimistic state, no partial score, no "we couldn't reach the site so here's
 * what we'd normally check". A failure renders as a failure.
 *
 * That mirrors the main repo's rule for the diagnosis form — which shipped a
 * bug where two spam gates showed a success card for leads that were never
 * sent. The equivalent bug here would be a score for a page we never read.
 *
 * fetch() goes to API.audit, which carries the /tools basePath explicitly.
 * fetch is a browser API and knows nothing about basePath, so a bare
 * "/api/audit" would hit the MAIN site and 404. */

type State =
  | { phase: "idle" }
  | { phase: "working" }
  | { phase: "done"; result: AuditResult }
  | { phase: "failed"; error: AuditError };

export default function AuditForm() {
  const [state, setState] = useState<State>({ phase: "idle" });
  const inputId = useId();
  const resultRef = useRef<HTMLDivElement>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const url = String(form.get("url") ?? "");
    const botcheck = String(form.get("botcheck") ?? "");

    setState({ phase: "working" });

    try {
      const response = await fetch(API.audit, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, botcheck }),
      });

      /* The body is read on EVERY status. The API answers 422 with a readable
       * message when the target can't be audited, and treating that as a
       * network failure would replace a useful sentence with a generic one. */
      const data = (await response.json()) as AuditResult | AuditError;

      if (isAuditError(data)) {
        setState({ phase: "failed", error: data });
      } else {
        setState({ phase: "done", result: data });
      }
    } catch {
      setState({
        phase: "failed",
        error: {
          error: "That request didn't get through.",
          hint: "Check your connection and try again.",
        },
      });
    }

    /* Move focus to the result region rather than scrolling the page under the
     * visitor — a keyboard or screen-reader user needs to LAND there. */
    requestAnimationFrame(() => resultRef.current?.focus());
  }

  const working = state.phase === "working";

  return (
    <div>
      <form onSubmit={onSubmit} noValidate>
        <label htmlFor={inputId} className="block font-medium text-ink">
          Which page should we check?
        </label>

        {/* Honeypot. Named "botcheck", NOT "website": Chrome autofills a field
         * called "website" even with autoComplete="off", which turns the trap
         * into a trap for real people — that exact bug cost the main site real
         * leads. Hidden from sight, from screen readers, and from tab order. */}
        <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <label htmlFor={`${inputId}-botcheck`}>Leave this empty</label>
          <input
            id={`${inputId}-botcheck`}
            type="text"
            name="botcheck"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id={inputId}
            name="url"
            type="text"
            inputMode="url"
            autoComplete="url"
            required
            placeholder="example.com"
            disabled={working}
            className="w-full rounded-card border-[1.5px] border-ink bg-paper px-5 py-3 text-ink placeholder:text-stone disabled:opacity-60 sm:flex-1"
          />
          <button
            type="submit"
            disabled={working}
            className={`${variantClasses.primary} shrink-0 disabled:opacity-70`}
          >
            {working ? "Reading the page…" : "Check this page"}
          </button>
        </div>

        <p className="mt-3 text-small text-stone">
          Any public page. It takes a few seconds — we&apos;re waiting on the
          site, same as a visitor would.
        </p>
      </form>

      {/* One live region for every outcome. aria-live="polite" announces the
       * result without interrupting; tabIndex -1 makes it a focus target. */}
      <div
        ref={resultRef}
        tabIndex={-1}
        aria-live="polite"
        aria-busy={working}
        className="mt-12 outline-none"
      >
        {state.phase === "working" && (
          <p className="text-slate">Fetching the page and running the checks…</p>
        )}

        {state.phase === "failed" && (
          <div className="rounded-card border-[1.5px] border-ink bg-paper p-6">
            <p className="text-eyebrow uppercase text-clay-700">
              We couldn&apos;t check that page
            </p>
            <p className="mt-3 font-medium text-ink">{state.error.error}</p>
            {state.error.hint && (
              <p className="mt-2 text-slate">{state.error.hint}</p>
            )}
          </div>
        )}

        {state.phase === "done" && <AuditReport result={state.result} />}
      </div>
    </div>
  );
}
