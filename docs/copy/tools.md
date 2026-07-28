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
is what gets cut. There's no AI here, and nothing you type is sent anywhere.
Edit whatever you pick.

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
A: No. The tool runs entirely in your browser and makes no request that carries
anything you typed — paste in unpublished page copy if you want to. Being exact,
since we're inviting you to check: the page loads the same anonymous page-view
counter as every other page on this site, so the network tab will show one
script. It records that the page was opened and never sees these fields.

⚠️ **CORRECTED 28 Jul 2026, and worth reading as a lesson.** This answer
originally read *"there's no server request at all, which you can confirm in
your browser's network tab."* **That was false.** `app/layout.tsx` mounts Vercel
Analytics, so the network tab shows requests to `va.vercel-scripts.com` on every
page of this app. Caught by a Playwright run that watched for off-origin
requests.

The failure wasn't the analytics — it was inviting the reader to verify a claim
and then failing their verification. That is worse than saying nothing, because
someone who checks concludes the whole page is padding. The claim is now scoped
to what is actually true ("no request that **carries what you typed**") and names
the script they will see.

**If analytics is ever removed from the layout, the wider claim becomes
available again. Not before.** And if any tool gains an autosave, an AI draft
button, or input-level analytics, this answer becomes false again and has to
change in the same commit.

**Placeholder examples used in the draft fields:** "Emergency plumbing repairs",
"Ganguly Plumbing", "Salt Lake" — invented illustrative examples, not a real
client. Swap them if you'd rather not imply one.

---

## Quote & Invoice Generator — `/tools/quote-generator`

**Eyebrow:** Quote & Invoice Generator

**H1:** A quote you'd be happy to send.

**Lede:** Fill it in, print it, or save it as a PDF straight from your browser.
No signup, no watermark, and nothing you type leaves your machine.

**Mode toggle:** Quote · Invoice
**Print button:** Print or save as PDF
**Clear button:** Clear everything
**Print disabled hint:** Add your business name and one line item first.

**Tax note (under the rate field):** Leave the rate blank and no tax line
appears at all — which is the right document if you aren't registered. Adding a
rate does not make this a tax invoice; see the note below the preview.

**Storage note:** Your draft is kept in this browser so a refresh doesn't lose
it, and nothing you type here is sent to us — the builder makes no request that
carries it. "Clear everything" wipes the saved draft.

🚩 **THE GST NOTE — the most important line on the page, and it PRINTS.**

> This is a plain quote/invoice, not a GST tax invoice. If you're registered for
> GST, a compliant invoice also needs your GSTIN, the customer's GSTIN, HSN or
> SAC codes and the place of supply — none of which this produces. Check with
> your accountant before using it for anything you'll file.

It prints deliberately: someone who saves the PDF and files it should still be
able to see what the document is and isn't. **Owner — this is the line most
worth your review**, because it's the one where being wrong costs a user money
rather than a ranking. If you'd rather the tool refused GST entirely (no tax
field at all), say so and the field comes out.

**Section title:** A document, not an accounting package.
**Section lede:** It fills in one quote or one invoice and hands it back. It
doesn't track what you've sent, chase payment, or file anything — and it doesn't
ask you to sign up so that it could.

**Closing CTA title:** Sending the quote is the easy part.
**Closing CTA body:** If the slow bit is everything around it — the chasing, the
retyping, the spreadsheet nobody trusts — that's the thing worth fixing.

### FAQ

**Q: Is this a proper GST tax invoice?**
A: No, and this is the one thing worth reading twice. It produces a plain quote
or invoice. A GST-compliant tax invoice also needs your GSTIN, the customer's
GSTIN, HSN or SAC codes and the place of supply, and this doesn't produce any of
them. If you're registered, check with your accountant before using it for
anything you'll file.

**Q: Where does what I type get stored?**
A: In your own browser, so a refresh doesn't destroy your work — and nowhere
else. The builder makes no request that carries anything you typed. Being exact,
since we're inviting you to check: the page loads the same anonymous page-view
counter as every other page on this site, so the network tab will show one
script. It records that the page was opened and never sees these fields. The
"Clear everything" button wipes the saved draft, as does clearing site data.

**Q: How do I get a PDF?**
A: Press "Print or save as PDF" and choose "Save as PDF" as the destination.
That's your browser's own PDF export rather than something we generate — it's
already on your machine, it handles fonts and page breaks properly, and it means
nothing has to be uploaded to produce a file.

**Q: Will the numbers add up correctly?**
A: Yes. Amounts are worked out in whole paise rather than decimals, so the total
always matches the lines above it. That sounds obvious, and it's the bug in a
surprising number of spreadsheet templates — a column of decimals can round to a
total that's a paise off what's printed.

> That last answer is a verified claim, not a boast: three lines of 3×0.1,
> 1×0.2 and 3×1234.35 sum to 3703.5499999999997 in plain floating point. The
> tool computes in integer paise and prints ₹3,703.55.

**Placeholder examples:** "Ganguly Plumbing", "Salt Lake", "Replace kitchen
mixer tap", "Acme Ltd" — invented illustrations, not real clients. Swap them if
you'd rather not imply one.

---

## Brand Kit Generator — `/tools/brand-kit`

**Eyebrow:** Brand Kit Generator

**H1:** One colour in. A palette you can actually use out.

**Lede:** Ten steps built so the gaps look even to a human eye, each one telling
you whether black or white text passes on it. Plus a type scale from a single
base size. Copy the CSS and go.

**Palette blurb:** Ten steps built by walking perceptual lightness, so the gaps
look even rather than measuring even. Each row says which text colour is legible
on it — measured, not guessed.

**Contrast footnote:** Ratios are WCAG 2.1 contrast, computed on the hex above.
AA wants 4.5 for body text and 3 for large text — 24px and up, or 19px and up if
it's bold. A step with neither black nor white passing is a background for
shapes, not for words.

**Section title:** Even numbers aren't even colours.
**Section lede:** The usual way to build a ramp is to hold the hue and walk
lightness in HSL. It's also why so many generated palettes have muddy middles:
HSL's lightness isn't perceptual. Pure yellow and pure blue both sit at 50%, and
one of them is blinding.

**Closing CTA title:** Colours are the easy half.
**Closing CTA body:** The hard half is a set of rules everyone actually follows,
so the site, the invoice and the van all look like the same company.

### The measured / chosen split — the rule this page is built on

The tool states which of its numbers are facts and which are opinions, and the
components enforce it:

- **MEASURED (facts):** every contrast ratio. WCAG 2.1 relative luminance,
  computed on the exact output hex — not on the pre-rounding float, because the
  hex is what ships and 8-bit rounding can move a ratio across a threshold.
- **CHOSEN (this tool's opinion, labelled as such):** the ten lightness targets,
  the five ratio names, and the suggested line heights.

Never let a "chosen" number drift into being presented as a standard.

### FAQ

**Q: What makes this different from other palette generators?**
A: Two things. The ramp is built in a perceptual colour space, so the steps look
evenly spaced instead of merely being evenly spaced in numbers — the usual
approach produces muddy middles and ends that bunch up. And every step tells you
whether black or white text actually passes contrast on it, which is the
question you'll hit the moment you try to use the colour.

**Q: Are the contrast numbers reliable?**
A: They're the WCAG 2.1 formula computed on the exact hex shown, so yes. Worth
being precise about what they cover: contrast between a text colour and a solid
background. They say nothing about text over a photo, over a gradient, or at a
weight so light it's hard to read at any ratio.

**Q: Is this my brand identity, then?**
A: No. It's a starting palette and a type scale — the mechanical part. A brand
is what you sound like and what you're for, and no tool derives that from a hex
code. This gets you a coherent set of colours to build with instead of picking
shades one at a time until they clash.

**Q: Why does one of my steps say no text colour passes?**
A: Because it's a mid-tone. Colours in the middle of the lightness range are too
dark for black text and too light for white, and no amount of wanting changes
that. Use it for a shape, a border, or a chart fill, and put words on the steps
that pass.

---

## QR Code Generator — `/tools/qr-generator`

**Eyebrow:** QR Code Generator

**H1:** A QR code that still works in five years.

**Lede:** It encodes your link directly — no redirect through us, nothing to
expire, nothing to start charging for. Download it as vector so it stays sharp
from a business card to a shopfront.

**Section title:** Most free QR codes point at someone else's website.
**Section lede:** They encode a short link on their own domain that forwards to
yours, which is how they offer scan counts. It also means your printed code
depends on their company still existing, and still being free.

**The honest trade, stated on the page:** we can't report scan numbers, because
nothing routes through us and there is nothing to count. If you need numbers,
encode a link you control that has its own analytics.

**Standing advice, repeated twice on purpose:** scan the proof before it goes to
print.

**Closing CTA title:** The code is the easy bit.
**Closing CTA body:** What happens in the ten seconds after someone scans it is
what decides whether you hear from them.

### FAQ

**Q: Will the code stop working later?**
A: No, and this is the one to check before using any QR generator. Plenty of
free sites encode a link to their own domain that redirects to yours, so they
can count scans — and if they change their pricing or shut down, every code you
printed dies. Ours encodes your address directly. There's nothing in the middle,
which also means we cannot tell you how many people scanned it.

**Q: SVG or PNG?**
A: SVG whenever the software will take it. It's vector, so it's sharp whether
the code ends up two centimetres wide on a card or two metres on a van. The PNG
is there for the software that still won't accept an SVG; it's 1024px, which is
enough for a few inches at print resolution.

**Q: Which error-correction level should I pick?**
A: Medium for most printing. Higher levels let the code survive scratches and
dirt, but they pack in more modules, so on a small print each module gets tinier
and it can end up harder to scan rather than easier. Go high for outdoor or
industrial surfaces, low only for screens.

**Q: Why is there a white border around it?**
A: That's the quiet zone, and scanners genuinely need it to find the code.
Cropping it off is the single most common reason a printed QR won't read. Keep
it, and keep good contrast — dark code on a light background, never the other
way round.

### Note for whoever maintains this

The encoder is hand-written (`lib/qr/encode.ts`, no runtime dependency) and
therefore carries a standing rule: **run `npm run check:qr` after touching it.**
A wrong QR code does not look wrong. During development this encoder had correct
data, correct Reed–Solomon parity, correct placement and a correct format value,
and still scanned as nothing, because 15 bits were written in the wrong order.
The picture was indistinguishable from a working code.

---

## Image Compressor — `/tools/image-compressor`

**Eyebrow:** Image Compressor

**H1:** Photos are why the page is slow.

**Lede:** A camera photo is often three or four megabytes. On a website it needs
to be a few dozen kilobytes. Drop them here and they're resized and re-encoded
on your own device — nothing is uploaded.

**Drop zone:** Drop images here · Up to 20 at a time. They stay on your device.

**Section title:** The biggest thing on most pages is a photo nobody resized.
**Section lede:** Not a framework, not a tracking script — a product shot
straight off a phone at full resolution, being downloaded in full and then
displayed four hundred pixels wide.

**Loss note (always on screen):** Re-encoding is lossy, so keep your originals —
this is for the copy that goes on the website, not your only copy. The browser
also drops all metadata in the process: that removes GPS coordinates from phone
photos, which is usually a good thing, but it also removes the colour profile
and any copyright field.

**Closing CTA title:** Compressing images is the first fix, not the only one.
**Closing CTA body:** If the page still drags once the photos are sensible,
something further in is the cause — and guessing at it is expensive.

### The "it got bigger" case — do not remove this

When an input is already well optimised, re-encoding costs more than it saves.
The row then reads **"already smaller than we can make it, so you get the
original back"** and the download button hands over the ORIGINAL file, not the
worse one.

This is the honesty rule in its most tempting spot: every percentage on this
page is measured on the real output blob, and it would be trivially easy — and
completely invisible to a user — to only ever show wins. Verified in the browser:
a 4 KB optimised JPEG takes this path while a 662 KB image compresses to 7 KB.

### FAQ

**Q: Do my photos get uploaded?**
A: No. The compressing happens inside this page — your browser decodes, resizes
and re-encodes the file, and nothing is sent. The only network request the page
makes is the same anonymous page-view counter as every other page on this site,
and it happens whether or not you add an image.

**Q: Why did one of my images get bigger?**
A: Because it was already well compressed, and re-encoding an optimised file
usually costs more than it saves. When that happens the tool says so on the row
and gives you the original back rather than a worse version of it.

**Q: What gets lost?**
A: Quality, a little, because re-encoding is always lossy — so keep your
originals; this is for the copy that goes on the site. All metadata goes too:
EXIF, camera settings, the colour profile, any copyright field, and GPS
coordinates. Losing the location out of a phone photo before it goes public is
usually a win. Losing a colour profile can shift a wide-gamut photo slightly.

**Q: WebP or JPEG?**
A: WebP, unless something in your workflow refuses it. It's meaningfully smaller
at the same visual quality and every current browser reads it. JPEG is there for
older software and for anyone who needs maximum compatibility.

---

## Not in this file

The eighteen check strings — each check's `found`, `why` and `fix` — live in
`lib/audit/checks.ts`, not here. They are technical explanations rather than
marketing copy, and keeping them beside the logic that produces them is what
stops a check and its description drifting apart.

They were still written by an agent. Worth a read at some point; lower priority
than the flagged lines above.
