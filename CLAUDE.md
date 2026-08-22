# CLAUDE.md — debugswift-tools

The free-tools app for DebugSwift. **A separate repo and deployment, served at
`debugswift.com/tools/*` through a reverse proxy from the marketing repo
(`E:\debugswift`).** One repo holds ALL the tools; each tool is a route. The
reasoning, and the arguments against splitting, are in
`E:\debugswift\debugswift-assets\tools-repo-spec.md` — read it before proposing
a different shape.

Brand, voice, positioning and the design system are owned by the marketing repo.
This repo owns tools.

## The three deployments, one domain

| | repo | basePath | dev port |
|---|---|---|---|
| Marketing | `E:\debugswift` | — | 3000 |
| Blog | `E:\debugswift-blog` | `/blog` | 3001 |
| Tools | this repo | `/tools` | 3002 |

From here, **both of the others are external.** `/services` and `/blog` are
equally "somewhere else" and equally need a bare `<a>`.

## basePath: the four traps (this is the whole repo's failure mode)

`basePath: "/tools"` is not optional — the proxy serves this app's pages under
`/tools`, and without it the URLs and the asset paths disagree. It costs four
specific bugs, and all four have bitten the blog repo already:

1. **`next/link` prefixes every href.** `<Link href="/about">` renders
   `/tools/about`, which exists nowhere. → main-site destinations use
   `MainSiteLink` (a bare `<a>`) or `Button` with its default `main`. Only
   routes in THIS app use `next/link`.
2. **`fetch()` knows nothing about basePath.** `fetch("/api/audit")` from a page
   at `/tools/website-audit` hits the MAIN site. → always use `API.*` from
   `lib/links.ts`.
3. **`next/image` drops the prefix from its `url` parameter**, and the optimizer
   then 404s the file on its own origin. → local image paths go through
   `publicAsset()`. SVGs rendered via `next/image` need a **static import**
   (they bypass the optimizer, so the raw src is emitted verbatim).
4. **A URL inside a CSS value is never prefixed.** `url(/brand/…)` in a style
   object resolves against the domain root and silently disappears. → see
   `components/icons.tsx`, where the mask URL goes through `publicAsset()`. This
   is currently a live bug in the blog repo; do not reintroduce it here by
   hardcoding a prefix that a re-copy will overwrite.

`lib/links.ts` is the single place all of this is encoded. Read it before
writing any link.

## Adding a tool

1. Add an entry to `lib/tools.ts` with `status: "planned"`.
2. Build `app/<slug>/page.tsx` and whatever `lib/<slug>/` it needs.
3. Flip `status` to `"live"` **only when the route works end to end.**

That's it. The hub, the footer's "In tools" list, and the sitemap all read from
the registry, and **nothing in the marketing repo needs to change.** Preserving
that property is the point of the single-repo decision — never hand-list tools
anywhere else.

`status: "planned"` tools are rendered on the hub as **plain text, not links.** A
link to a page that does not exist is a lie the visitor finds by clicking.

## The honesty rules (inherited, non-negotiable, and sharper here)

The marketing repo's rules apply in full. Tools make two of them easy to break,
because a number on a screen looks more authoritative than a sentence:

- **Never invent a benchmark.** No industry averages, no "sites like yours score
  X", no percentile. Every number a tool shows is measured from the user's own
  input or is a stated product spec. The thresholds in `lib/audit/checks.ts` are
  the tool's own opinions and are labelled as such on screen.
- **A tool must never report a result it did not compute.** If the page can't be
  fetched, the tool says so and shows nothing — no partial score, no "here's
  what we'd normally check". `lib/audit/checks.ts` refuses to score an HTTP 4xx
  page for exactly this reason. Same fail-loud discipline as the marketing
  repo's diagnosis form.
- **No fake progress theatre.** Don't stall a fast computation to make it feel
  expensive.
- **No `aggregateRating` in structured data, ever.** There are no reviews, so
  there is no rating. `lib/seo.ts` says this too.
- **The result is not gated.** The on-screen result is free and needs no email.
  An email may only ever be asked for a full/emailed report — and nothing does
  that yet. `docs/copy/tools.md` flags this as a binding promise.

## Security: `lib/audit/fetchPage.ts`

This app takes a URL from a stranger and fetches it server-side. That is an SSRF
primitive, and `lib/audit/fetchPage.ts` is the boundary that makes it safe:
scheme allow-list, DNS resolution checked against private/reserved ranges before
the request, manual redirect following so every hop is re-validated, plus
timeout, redirect cap and a byte cap.

**Read that file's header comment before changing anything in it**, including
the documented, accepted DNS-rebinding gap and the condition that would make it
unacceptable (returning the fetched body).

Rate limiting is `lib/rateLimit.ts` — in-memory, honest about being a speed
bump, and not the important defence.

## Copy

`docs/copy/tools.md` is the copy source. **It is currently an agent-written
DRAFT and is not owner-approved** — that is stated at the top of the file, with
two lines flagged for the owner's judgement.

Build components FROM that file. If copy for a new surface is missing, write it
into `docs/copy/` as a flagged draft and say so in your summary — do not bury
invented strings in JSX. (That was a real gap in the blog repo, self-reported
after the fact; the point of this rule is to not repeat it.)

Check-level strings (`found` / `why` / `fix`) live beside the logic in
`lib/audit/checks.ts` on purpose, so a check and its description cannot drift.

## Design

`docs/design-system.md` governs. **It is a MIRROR of the marketing repo's file
and is hook-blocked here** — change it upstream and re-copy, never fork it.
Run the §9 anti-AI checklist before declaring any UI done; the
`debugswift-design` skill is the working summary.

Two rules that are easy to get wrong in this app specifically:

- **No green, no red.** The token tables have no semantic status colours.
  Audit statuses use Indigo 600 / Ink / Clay 700 / Slate plus a glyph — see the
  header comment in `components/AuditReport.tsx`. Never invent a hex.
- **Clay ≤2% per viewport, and never a background.** A report with six failing
  checks must not put six clay fills in one view. Status is carried by text
  colour, not by fills.

Mobile centres content, desktop stays left-anchored (owner's call, 22 Jul 2026)
— this overrides design-system §9 on mobile only. Don't "fix" it back.

Deb: three poses, no fourth, placed through `components/Deb.tsx` only.

## Commands

- `npm run dev -- -p 3002` — dev server, then open **`localhost:3002/tools`**
- `npm run build` · `npm run lint` · `npm run typecheck`

## Live since 22 August 2026

`debugswift.com/tools` is proxied to this deployment. `TOOLS_ORIGIN` is set on
the MAIN Vercel project, the `/tools` entry is in its `app/sitemap.ts`, its
`app/robots.ts` advertises `/tools/sitemap.xml`, and its placeholder route is
deleted. **Nothing further is needed in the marketing repo to add a tool** — a
registry entry plus a route folder here is the whole job, which is the property
the single-repo shape exists to protect.

Two things that cost time getting here, worth not rediscovering:

- **`async rewrites()` is evaluated at BUILD time.** Setting `TOOLS_ORIGIN` in
  the Vercel dashboard changes nothing until the marketing project is
  redeployed. It looks exactly like a broken proxy. Check
  `curl -I https://debugswift.com/tools` — a stale `age:` on a cache `HIT` means
  no rebuild has happened.
- **The env var goes on the MARKETING project, not this one.** Setting it here
  does nothing at all.

**Deployment needs zero environment variables**, and that should stay true. If a
tool ever needs a key, it also needs a line in `.env.example` and a note here.

## Don't

- Don't add a dependency without stating why. Most of the tool menu is
  arithmetic, string templating, or a browser-side encode. The audit deliberately
  parses HTML with a small hand-rolled reader (`lib/audit/html.ts`) — its header
  explains what that does and does not buy, and when a real parser becomes the
  right call.
- Don't add a CMS. Tools are code; Sanity is the blog's stack, not this one.
- Don't fork `globals.css`, the components, or the design system. They are copies
  of the marketing repo's and must stay in step — a visitor crossing from
  `/services` to `/tools` must not see the page shift.
- Don't run Playwright unprompted (owner reviews visuals himself).
