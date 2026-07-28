# Tools copy — DRAFT, NOT OWNER-APPROVED

**Status: every string below was written by an agent on 28 July 2026, not by
Rijaul, and not lifted from an approved source.** The main repo's rule is "build
pages FROM `docs/copy/`; never invent marketing copy" — there was no copy file
for the tools app to build from, so this file exists to make the invention
visible and reviewable rather than buried in JSX.

The blog repo hit this exact gap and self-reported it (see
`E:\debugswift-blog\docs\copy\blog-chrome.md`). Same handling here.

**Owner: read this file, not the components.** Anything you change here, an
agent then propagates to the JSX — not the other way round.

Two lines are flagged specifically for your judgement, marked 🚩 below.

---

## Hub — `/tools`

**Eyebrow:** Free Tools

**H1:** Useful before you ever pay us.

> Lifted from the main site's existing coming-soon placeholder
> (`app/tools/page.tsx`), which is live. Not new.

**Lede:** Small tools that give you a straight answer and then get out of the
way. No signup, no email wall, no drip sequence afterwards.

🚩 **"No signup, no email wall, no drip sequence afterwards."** — this is a
promise, and it binds. The tools-repo spec's rule is narrower than the sentence:
the on-screen result is free and ungated, and an email is only ever asked for
the full/emailed report. If you plan to gate anything further, this line has to
change first.

**Live tools heading (eyebrow):** Ready now
**Planned tools heading (eyebrow):** On the bench

**Planned-list note:** These aren't built yet. They're listed because it's the
plan, not because they're hiding behind a signup.

**Closing CTA title:** Something the tool can't tell you?
**Closing CTA body:** A tool checks a page. A conversation finds the thing
that's actually costing you money. Twenty minutes, no charge, no pitch.
**Closing CTA button:** Book a free diagnosis → `/contact#diagnosis`

---

## Website Audit — `/tools/website-audit`

**Eyebrow:** Website Audit

**H1:** See your page the way a search engine does.

**Lede:** Paste a web address. We fetch the page once, run 18 checks on whether
it gets found and whether a visitor can act on it, and show you every answer —
including the ones that pass.

**Form label:** Which page should we check?
**Form placeholder:** example.com
**Form button (idle):** Check this page
**Form button (working):** Reading the page…
**Form note:** Any public page. It takes a few seconds — we're waiting on the
site, same as a visitor would.

### What it checks (section)

**Eyebrow:** What's in the report
**Title:** 18 checks, in five groups.
**Lede:** Every one is measured on the page you give us. There are no
benchmarks, no scores borrowed from other sites, and no "businesses like yours"
— we haven't surveyed them, so we won't pretend we have.

Group names, as rendered:
1. **Findability** — whether search engines can reach and index it at all.
2. **On the page** — the title, description, headings and alt text.
3. **How it shares** — what the link looks like pasted into WhatsApp.
4. **Getting in touch** — whether a visitor on a phone can act in one tap.
5. **Delivery** — response time, page weight, blocking scripts.

### Results

**Score line:** {passed} of {total} checks passed
**Score caveat:** That's this tool's opinion of {total} specific things, not a
grade out of a hundred. The list below is the score — nothing is hidden.
**Score caveat, second sentence — only shown when it applies:** We ran {ran}
checks; {skipped} didn't apply to this page and are marked *for information*
below rather than counted.

> Why that second sentence exists: the alt-text check reports "for information"
> when a page has no images at all, so the denominator is 17 rather than 18 on
> such a page. Without saying so, a visitor comparing two audits would be
> comparing two different scales. The number 18 is `TOTAL_CHECKS` in
> `lib/audit/checks.ts` and every place that quotes it reads it from there —
> including this file's own "18 checks" heading, which is the one copy in prose.

**Measured line:** Checked {url} · {time}

**Status labels:** Passed · Worth a look · Needs fixing · For information

**Empty/idle state:** Nothing checked yet.

**Failure heading:** We couldn't check that page.

### FAQ

**Q: Is this really free?**
A: Yes, and there's no email step. You get the full result on screen. We build
this kind of thing for a living, and a tool that's useful before you pay is a
better argument than a case study.

**Q: Does a perfect score mean my site is fine?**
A: No. It means 18 specific things are in order on one page. It says
nothing about whether the page is persuasive, whether the right people find it,
or whether the phone rings. Those are the questions worth asking next.

**Q: You said my response time was slow. Is that reliable?**
A: It's one request from one server, at one moment. Treat it as a hint, not a
verdict — if it looks bad, confirm it with a proper speed test before spending
money on it. We say the same thing in the result itself.

**Q: Do you store the pages you check?**
A: The audit runs when you ask for it and the result is sent straight back to
your browser. We don't keep a copy, and there's no account to attach it to.

🚩 **The privacy answer above** — it describes the code as written today (no
database, nothing persisted, and the rate limiter holds an IP in memory only).
If a tool ever starts storing submissions, this answer becomes false and the
deferred privacy-policy item in `tools-repo-spec.md` stops being deferrable.

**Closing CTA title:** Want these fixed rather than listed?
**Closing CTA body:** The report tells you what's wrong. If you'd rather not
spend a weekend on it, that's the job.
**Closing CTA button:** Book a free diagnosis → `/contact#diagnosis`

---

## Meta & Headline Generator — `/tools/meta-generator`

**Eyebrow:** Meta & Headline Generator

**H1:** See where Google actually cuts your title.

**Lede:** Google truncates search results by pixel width, not by character
count — so every tool that counts characters is measuring the wrong thing. This
one measures the real width as you type, against 600px for the title and 920px
for the description.

> The two pixel numbers come from `TITLE_PIXEL_BUDGET` and
> `DESCRIPTION_PIXEL_BUDGET` in `lib/meta/measure.ts`; the page reads them from
> there rather than repeating them, so they cannot drift.

**Field labels:** Title tag / The clickable line in search results ·
Meta description / The sentences underneath it
**Live counter:** {width}px of {budget}px — being cut · {n} characters
**Preview heading:** Roughly how it lands
**Preview empty state:** Type a title above and this fills in.

**Preview caveat:** Faded text is the part that gets cut off. Measured in Arial
at Google's desktop sizes, so treat the cut-off point as close rather than
exact — and remember Google rewrites titles it doesn't like, whatever length
they are.

**Drafts heading:** Need a starting point?
**Drafts body:** Fill these in and you'll get drafts built from the usual
shapes — specific thing first, business name last, because the end of the line
is what gets cut. There's no AI here and nothing is sent anywhere. Edit whatever
you pick.

**Section title:** Character counters get this wrong.
**Section lede:** Not by a little. Two titles of identical length can differ by
well over a hundred pixels, which is the difference between a line that reads
cleanly and one that ends mid-word.

**Closing CTA title:** Tags fixed, phone still quiet?
**Closing CTA body:** Titles decide whether people click. What happens after the
click is a different problem, and usually the more expensive one.

### FAQ

**Q: Why measure pixels instead of counting characters?**
A: Because that's what Google does. It cuts the line when it runs out of room,
and "Illinois plumbing inspections" takes far less room than the same number of
capital Ws. A character counter will tell you a 55-character title is safe when
it's already being cut, and that a 62-character one is too long when it fits
fine.

**Q: So my title will definitely show up like that?**
A: No. Two caveats, both real. Google rewrites titles it judges unhelpful,
whatever length they are — a title that fits is not a title that gets used. And
the preview measures in Arial at Google's desktop sizes, which is close to their
rendering but not identical. Treat the cut-off point as a good guide, not a
guarantee.

**Q: Is there AI behind the drafts?**
A: No. The drafts are four title shapes and two description shapes filled in
with what you typed — the specific thing first, the business name last, because
the end of the line is what gets cut. It's formatting, not writing, and it's
meant to be edited.

**Q: Does anything I type get sent to you?**
A: No. This tool runs entirely in your browser — there's no server request at
all, which you can confirm in your browser's network tab. Paste in unpublished
page copy if you want to.

🚩 **"Nothing is sent anywhere" / "no server request at all"** — true as built
(the tool is one client component with no fetch). It stops being true the moment
anyone adds analytics on the input, an autosave, or an AI draft button. If a
future version calls a model, this answer and the H1 section both have to change
in the same commit.

**Placeholder examples used in the draft fields:** "Emergency plumbing repairs",
"Ganguly Plumbing", "Salt Lake" — invented illustrative examples, not a real
client. Swap them if you'd rather not imply one.

---

## Not in this file

The eighteen check strings — each check's `found`, `why` and `fix` — live in
`lib/audit/checks.ts`, not here. They are technical explanations rather than
marketing copy, and keeping them beside the logic that produces them is what
stops a check and its description drifting apart.

They were still written by an agent. Worth a read at some point; lower priority
than the flagged lines above.
