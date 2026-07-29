"use client";

import { useId, useState } from "react";
import {
  BLANK_BUSINESS,
  BUSINESS_TYPES,
  buildSchema,
  issuesFor,
  toScriptTag,
  type BusinessInput,
  type Hours,
} from "@/lib/schema/build";

/* The schema generator.
 *
 * Pure formatting: every value in the output was typed in here. The tool
 * invents nothing, and there is deliberately no aggregateRating field — a star
 * rating you type in yourself, unbacked by real reviews on the page, is the
 * thing that earns a manual action. If that field is ever requested, the answer
 * is still no.
 *
 * Nothing is sent anywhere; this is string assembly in the browser.
 */

export default function SchemaGenerator() {
  const [biz, setBiz] = useState<BusinessInput>(BLANK_BUSINESS);
  const [copied, setCopied] = useState(false);
  const id = useId();

  const set = <K extends keyof BusinessInput>(key: K, value: BusinessInput[K]) =>
    setBiz((b) => ({ ...b, [key]: value }));

  const setHours = (day: string, patch: Partial<Hours>) =>
    setBiz((b) => ({
      ...b,
      hours: b.hours.map((h) => (h.day === day ? { ...h, ...patch } : h)),
    }));

  const issues = issuesFor(biz);
  const output = toScriptTag(biz);
  const hasAnything = Object.keys(buildSchema(biz)).length > 2;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-12">
      <div>
        <label htmlFor={`${id}-type`} className="font-medium text-ink">
          What kind of business?
        </label>
        <p className="mt-1 text-small text-slate">
          When in doubt, leave it as the general one. A wrong specific type is
          worse than a right general one.
        </p>
        <select
          id={`${id}-type`}
          value={biz.type}
          onChange={(e) => set("type", e.target.value)}
          className="mt-3 w-full rounded-card border-[1.5px] border-ink bg-paper px-4 py-3 text-ink"
        >
          {BUSINESS_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Business name" value={biz.name} onChange={(v) => set("name", v)} placeholder="Ganguly Plumbing" />
        <Field label="Website" value={biz.url} onChange={(v) => set("url", v)} placeholder="https://example.com" />
        <Field label="Phone" value={biz.telephone} onChange={(v) => set("telephone", v)} placeholder="+91 85850 30894" />
        <Field label="Email" value={biz.email} onChange={(v) => set("email", v)} placeholder="hello@example.com" />
        <Field label="Street address" value={biz.street} onChange={(v) => set("street", v)} placeholder="12 Sector V" />
        <Field label="Town or city" value={biz.locality} onChange={(v) => set("locality", v)} placeholder="Kolkata" />
        <Field label="State or region" value={biz.region} onChange={(v) => set("region", v)} placeholder="West Bengal" />
        <Field label="Postcode" value={biz.postalCode} onChange={(v) => set("postalCode", v)} placeholder="700091" />
        <Field label="Country code" value={biz.country} onChange={(v) => set("country", v)} placeholder="IN" />
        <Field
          label="Price range"
          value={biz.priceRange}
          onChange={(v) => set("priceRange", v)}
          placeholder="₹₹"
          hint="Rough band only, like ₹₹. Never an actual price."
        />
      </div>

      <div>
        <label htmlFor={`${id}-desc`} className="text-small font-medium text-ink">
          One-line description
        </label>
        <input
          id={`${id}-desc`}
          type="text"
          value={biz.description}
          placeholder="Emergency plumbing and boiler servicing in Salt Lake."
          onChange={(e) => set("description", e.target.value)}
          className="mt-2 w-full rounded-card border-[1.5px] border-ink bg-paper px-4 py-2.5 text-ink placeholder:text-slate"
        />
      </div>

      {/* ------------------------------------------------------------- hours */}
      <div>
        <p className="text-eyebrow uppercase text-indigo-600">Opening hours</p>
        <p className="mt-3 max-w-2xl text-small text-slate">
          This is where the “Open now” line in search results comes from. Days
          with the same hours are grouped together in the output.
        </p>
        <ul className="mt-4 divide-y-[1.5px] divide-mist border-y-[1.5px] border-mist">
          {biz.hours.map((h) => (
            <li key={h.day} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              <span className="w-28 font-medium text-ink">{h.day}</span>
              <label className="flex items-center gap-2 text-small text-slate">
                <input
                  type="checkbox"
                  checked={h.closed}
                  onChange={(e) => setHours(h.day, { closed: e.target.checked })}
                  className="h-4 w-4 accent-indigo-500"
                />
                Closed
              </label>
              {!h.closed && (
                <>
                  <label className="sr-only" htmlFor={`${id}-${h.day}-open`}>
                    {h.day} opening time
                  </label>
                  <input
                    id={`${id}-${h.day}-open`}
                    type="time"
                    value={h.open}
                    onChange={(e) => setHours(h.day, { open: e.target.value })}
                    className="rounded-card border-[1.5px] border-ink bg-paper px-3 py-1.5 text-ink"
                  />
                  <span aria-hidden="true" className="text-slate">
                    to
                  </span>
                  <label className="sr-only" htmlFor={`${id}-${h.day}-close`}>
                    {h.day} closing time
                  </label>
                  <input
                    id={`${id}-${h.day}-close`}
                    type="time"
                    value={h.close}
                    onChange={(e) => setHours(h.day, { close: e.target.value })}
                    className="rounded-card border-[1.5px] border-ink bg-paper px-3 py-1.5 text-ink"
                  />
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <label htmlFor={`${id}-same`} className="text-small font-medium text-ink">
          Your profiles elsewhere
        </label>
        <p className="mt-1 text-small text-slate">
          One full address per line — Google Business Profile, Facebook,
          Instagram, a directory listing. This is how a search engine confirms
          you&apos;re the same business it has seen elsewhere.
        </p>
        <textarea
          id={`${id}-same`}
          rows={4}
          value={biz.sameAs}
          placeholder={"https://www.facebook.com/…\nhttps://maps.app.goo.gl/…"}
          onChange={(e) => set("sameAs", e.target.value)}
          className="mt-2 w-full resize-y rounded-card border-[1.5px] border-ink bg-paper px-4 py-2.5 text-ink placeholder:text-slate"
        />
      </div>

      {/* ------------------------------------------------------------ output */}
      <div className="border-t-[1.5px] border-mist pt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-eyebrow uppercase text-indigo-600">
            Paste this into your &lt;head&gt;
          </p>
          <button
            type="button"
            onClick={copy}
            disabled={!hasAnything}
            className="font-medium text-indigo-600 underline-offset-4 transition-colors duration-200 ease-out hover:text-indigo-700 hover:underline disabled:opacity-40"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {issues.length > 0 && (
          <div className="mt-4 rounded-card border-[1.5px] border-mist p-5">
            <p className="text-small font-medium text-ink">Worth adding</p>
            <ul className="mt-2 space-y-1">
              {issues.map((i) => (
                <li key={i.field} className="text-small text-slate">
                  — {i.message}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-small text-slate">
              The markup below still works without these. It just says less.
            </p>
          </div>
        )}

        <pre className="mt-5 overflow-x-auto rounded-card border-[1.5px] border-ink bg-paper p-5 text-small">
          <code className="text-ink">{output}</code>
        </pre>

        <p className="mt-4 max-w-2xl text-small text-slate">
          Check it afterwards with Google&apos;s Rich Results Test. And keep it
          honest: the markup has to describe what a visitor can actually see on
          the page. Hours in the markup that disagree with the hours on the page
          is the mistake that gets structured data ignored.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-small font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-card border-[1.5px] border-ink bg-paper px-4 py-2.5 text-ink placeholder:text-slate"
      />
      {hint && <p className="mt-1 text-small text-slate">{hint}</p>}
    </div>
  );
}
