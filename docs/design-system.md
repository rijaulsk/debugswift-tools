# DebugSwift Design System

> **Merged 20 July 2026** from three layers that used to live in two files: `design-system-v1-1.md`
> (base system) + `design-system-v2.md` (a "Premium Amendment" approved 10 July) + a v2.1
> changelog that was itself appended to the bottom of the v2 file on 11 July, reversing part
> of v2. Nobody had merged the three into one coherent read before now — this document
> resolves every conflict to its latest documented rule and says explicitly, section by
> section, which layer a rule came from. Both source files are deleted; this is the one
> design-system doc going forward. Amend it in place — do not spin up a `v3.md`.
>
> **Known drift (flagged honestly, not fixed here):** while merging, two rules were found to
> already be stale against the live components — see the callouts in §2 (Numerals) and §4
> (Ledger List). This document is a faithful merge of what was previously written down, not a
> fresh audit of the current UI. If you need the current-truth answer for something and this
> doc and the live component disagree, **the component wins** — then come back and fix this
> doc, the same way this merge just did.

**Brand:** DebugSwift · **Slogan:** "Debugging businesses swiftly." · **Mascot:** Deb, a swift · **Font:** Satoshi · **Primary:** `#6467F2` (locked)

**The origin story (use everywhere):** real swifts are aerial insectivores — they literally catch bugs in flight, faster than any bird in level flight. The slogan isn't a pun; it's ornithology. Deb catches bugs. That's the brand in one sentence.

---

## 1. Color system (base: v1.1 §1; contrast/dark-band rules amended by v2 §3)

Method: all ramps derived in OKLCH from `#6467F2` (L 0.589, C 0.204, H 277°). One tone curve across all hues; accent chroma matched to primary so nothing shouts. Never invent in-between hexes — pick from the tables.

### Indigo — primary ramp
| Stop | Hex | Role |
|---|---|---|
| 50 | `#F1F3FE` | faint wash, hover tints |
| 100 | `#E2E6FF` | section washes, chips |
| 200 | `#C9D1FF` | mascot 3D highlight |
| 300 | `#ABB6FE` | **mascot 3D body midtone** |
| 400 | `#8792FE` | secondary UI, dark-mode links |
| 500 | `#6467F2` | **brand — wordmark, icons, large text (≥24px), fills** (locked) |
| 600 | `#5251DA` | hover/pressed on 500; 🆕 **also eyebrow labels + tertiary text links on Cream/Sand** (v2 §3 contrast fix — Indigo 500 fails WCAG AA at small text sizes) |
| 700 | `#423EBA` | deep accents, mascot shadow depth |
| 800 | `#332E96` | dark blocks (rare) |
| 900 | `#22206B` | darkest, footer/dark-band accents |

### Clay — warm accent ramp (CTA color)
| Stop | Hex | Role |
|---|---|---|
| 50 | `#FFF0E9` | faint wash |
| 100 | `#FFE1D4` | tag/badge backgrounds |
| 200 | `#FEC6AD` | — |
| 300 | `#FAA47D` | — |
| 400 | `#F38E60` | CTA hover |
| 500 | `#E87D4A` | **primary CTA fill** |
| 600 | `#C55E29` | CTA pressed |
| 700 | `#9F440F` | — |
| 800 | `#7B3000` | — |
| 900 | `#571F00` | text on clay 100–300 backgrounds |

**⚠️ THE CLAY RULE (hard, non-negotiable):** clay-on-cream with an elegant serif is currently *the* most common AI-generated design look. DebugSwift escapes it only through rationing. Clay appears ONLY as: primary CTA buttons (one per **viewport**, not per page — a long page may repeat the CTA every 2–3 sections as long as only one is ever visible at once), small highlight moments (an underline, a stat, a badge), and the mascot's beak/feet if the design chat chooses. Clay is NEVER a section background, NEVER an illustration base, NEVER ambient. Indigo must always visually dominate.

### Warm neutrals (H 80, near-zero chroma — same tone curve)
| Name | Hex | Role |
|---|---|---|
| Cream | `#F7F3EB` | **page background** (never pure white pages) |
| Sand | `#ECE7DF` | alternate section bands, dividers |
| Mist | `#D8D4CD` | hairlines, disabled; 🆕 **also dark-band body text** (v2) |
| Stone | `#A8A49E` | placeholder, captions — fails AA at small sizes, large sizes only |
| Slate | `#5E5A53` | **body text** |
| Charcoal | `#3C3730` | subheads |
| Ink | `#221D17` | **headings, borders, primary text** (never `#000`) |
| Paper | `#FFFFFF` | cards ONLY — white = elevation signal |

### Semantic (UI states only — chroma held below brand so states whisper)
| State | 500 | 100 (bg) | 700 (text-on-100) |
|---|---|---|---|
| Success | `#2A9754` | `#D1F2D8` | `#046732` |
| Warning | `#A77601` | `#FBE5C1` | `#704E03` |
| Danger | `#DA4053` (rose-red, H18 — deliberately far from clay) | `#FEDFDF` | `#9F0A2E` |
| Info | = Indigo 500 | `#E2E6FF` | `#423EBA` |

### Dark mode (tools, dashboards, code blocks — not the marketing site, which stays light/cream)
Indigo-tinted near-blacks, not gray: bg `#10121C`, surface `#1B1D29`, raised `#272936`. Body text Mist `#D8D4CD`, headings Cream, links Indigo 400 `#8792FE`, CTA stays Clay 500.

### Distribution rule of thumb
Cream ~60% of any view · Ink/Slate text ~30% · Indigo identity ~8% · Clay ≤2%. Exactly one signature gradient exists in the entire brand (reserved for the hero animation backdrop, or nothing). The indigo→violet→pink wash is banned.

### Contrast pairings (pre-checked, use these)
- Body: Slate on Cream · Headings: Ink on Cream
- CTA: Ink `#221D17` on Clay 500 (never white — white-on-clay fails contrast)
- On Indigo 500 fills: white text OK at ≥16px semibold; prefer Indigo 50
- On Indigo 100/200 washes: Indigo 700–900 text, never black
- On Clay 100 badges: Clay 800–900 text
- 🆕 **Eyebrow labels + tertiary text links on Cream/Sand: Indigo 600, not 500** (small-text AA fix, v2 §3). Indigo 500 stays correct for large text, icons, wordmark, fills.

### 🆕 Dark band rule (v2 §3)
Each page may use **at most ONE** Indigo 900 `#22206B` full-bleed band (the footer counts by default, unless a page uses its one dark band elsewhere — then the footer is still allowed as an exception). On it: headings Cream, body Mist, links Indigo 400 (page bands) or Indigo 200 (footer specifically, per §8 below), dividers Indigo 800. CTA on dark stays Clay 500 + Ink text.

---

## 2. Typography (base: v1.1 §2; Display-XL added by v2 §2)

| Role | Size/Leading | Weight | Notes |
|---|---|---|---|
| Display-XL | 88/92, −2.5% tracking | Black 900 | 🆕 homepage hero at ≥1280px only (v2) |
| Display | 72/76 (mobile 44/48) | Black 900 | other heroes, −2% tracking |
| H1 | 52/58 (mobile 36) | Bold | page titles |
| H2 | 36/42 | Bold | section titles |
| H3 | 24/32 | Medium | card/sub titles |
| Body | 18/28 | Regular | Slate, never light-gray-on-white |
| Small | 15/22 | Regular | captions, meta |
| Eyebrow | 13/16 | Medium | UPPERCASE, +6% tracking, Indigo 600 on Cream/Sand (§1 contrast fix), above every section title |

**⚠️ Known-stale entry, flagged during this merge:** v2 §2 also defined a "Numeral" role — display-size digits in Indigo 100 fill or 1.5px Ink outline, for "process steps / stat bands." The v2.1 changelog (§4 below) later removed oversized ghost numerals entirely, replacing them with the Ledger List archetype. Checked against the live components while merging: `StatBand.tsx` renders stats at plain `text-display` size (not the oversized/outlined Numeral style), and `LedgerList.tsx` uses small tabular two-digit numerals (01, 02) in a right-aligned gutter — neither matches the original "Numeral" spec. **Treat the Numeral role as dead; it's kept here only so nobody reinvents it independently.**

Editorial rules: left-anchored layouts, asymmetric whitespace, no centered heroes. The eyebrow-label + oversized-display pattern is the cheapest "magazine, not template" signal — use it consistently.

> 🆕 **Mobile exception (owner's call, 22 Jul 2026 — not a defect, do not "fix" it back).** Left-anchoring is a **desktop** rule. Below the `lg` breakpoint the whole site **centres** its content — headings, ledes, CTAs, card bodies, stat labels. In code this is the `text-center lg:text-left` pair, and the `align="center-mobile"` prop on `Section`/`SectionHeader`/`StatBand`/`BlueprintFlow`. Rationale: at 390px there is no counter-column for asymmetry to play against, so a left-anchored block reads as a broken margin rather than an editorial choice. The §9 checklist item "12-column asymmetric layout actually used" is therefore assessed **at 1440px only**; at 390px the correct result is centred. One deliberately broken grid moment per page (mascot overlapping a section boundary, a pull-quote hanging into the margin). Copy: real outcomes, real numbers, plain speech; banned words per §11.

---

## 3. Canvas & grid (v2 §1 — replaces v1.1's implicit layout widths entirely)

- **Content max-width: 1320px** (`max-w-canvas`), 24px side padding mobile / 48px desktop.
- **12-column editorial grid** on desktop. Body copy doesn't float in a narrow column against dead space: long text sits in asymmetric grid splits (7/4, 8/3, 6/5 with an offset) with the counter-column doing real work — stats, pull-facts, Deb, section indexes, sticky labels.
- Full-bleed color bands with the grid inside. Left-anchored asymmetry and the one-grid-break-per-page rule survive from v1.1.
- Section padding: 112–144px desktop / 64–80px mobile, asymmetric on purpose.

---

## 4. Layout & components (base: v1.1 §3; depth rules added by v2 §4; archetypes/icons added by v2.1)

- **Cards:** flat Paper or Cream, **1.5px Ink border**, radius 14px. No drop shadows, no glassmorphism, ever. The 3D mascot supplies all the dimensionality the brand needs; components stay flat.
- **Buttons:** pills (999px radius). Primary = Clay 500 fill, Ink text, hover Clay 400, pressed Clay 600 — one per viewport. Secondary = transparent, 1.5px Ink border, Ink text. Tertiary = Indigo 500/600 text link with underline on hover.
- **Radius:** 14px everywhere except pills. No mixed radii.
- **Grain:** one site-wide 3% grain/paper texture overlay on cream sections — applied once as a layer, never per-component.
- **Circuit motif:** faint single-weight circuit-trace line pattern in Indigo 200 at ≤8% opacity — section backgrounds, dividers, 404/empty states. Never on the bird.
- **Spacing:** 8px base grid (canvas/section padding per §3 above, which supersedes v1.1's original 96–128/56–72 figures).
- 🆕 **Depth without shadows (v2 §4):** premium depth comes from structure, never blur — overlapping blocks across band boundaries (negative margins), sticky side labels on long pages, 1.5px ink-border cards on shifting band colors (cream → paper → sand → indigo-900 rhythm). Drop shadows remain banned outright regardless.
- 🆕 **Ledger List, corrected (v2.1 described it as "2px Indigo 200 connected vertical line, 18px Indigo 600 dots, white numerals" — replacing filled indigo-circle steppers). That description is ALSO now stale.** The live `components/LedgerList.tsx` was redrawn again since: a ledger *gutter*, not a stepper — right-aligned tabular two-digit numerals (`01`, `02`) against a continuous 1.5px hairline rule, not dots on a line. If you're building something that uses step numbering, read the component, not this paragraph's history.
- 🆕 **Icons (v2.1):** `lucide-react` only, 20–24px, 1.5px stroke, Indigo 600. Used for checklists, stat bars, footer contact, FAQ markers. Never decorative rows, never one icon per heading just to fill space.
- 🆕 **Section archetypes (v2.1):** editorial split · demo stage (phone mockups) · indigo band (max 1 per page, footer excluded from the count by default) · proof band · ledger list · FAQ. No two adjacent sections on a page share an archetype — this is what stops a long page reading as one repeated template block.
- **Banned outright:** glassmorphism, gradient-mesh/aurora backgrounds, floating 3D abstract shapes, emoji section icons, the 3-feature-card centered row, parallax, scroll-scrubbed/pinned scenes, marquees, text-splitting letter reveals, Inter.

---

## 5. Motion — FINAL, resolved (v1.1 §4 base, restored by v2.1 after v2 §5 briefly replaced it)

**This is the one place v2 wrote a rule and then reversed it eleven days later — read the resolution, not the history, if you just need the current answer.**

- **200ms ease-out hovers, 250ms panel transitions.** That's the whole UI motion budget.
- **No scroll-triggered reveals, fade-ups, or count-up numerals anywhere.** (v2 §5 introduced an elaborate IntersectionObserver reveal system — 16px rise + fade, staggered, count-up stats. The 11 July Redesign Brief reversed all of it site-wide. Do not resurrect it; it was tried and explicitly undone.)
- **One sanctioned exception:** `ChatDemo`'s last message bubble fades in once on page load (250ms). Nothing else gets a load animation.
- **Deb is the only richly animated element** on any page.
- `prefers-reduced-motion`: everything above collapses to instant/static; Deb falls back to her static hero pose.

---

## 6. Navigation & footer (v2 §6, refined by the v2.1 changelog)

- **Header (updated 24 Jul 2026 — matches live `Header.tsx`):** Home (wordmark) · Services (dropdown panel, 250ms) · About · Blog · Tools · Contact · "Book a free diagnosis" pill — **secondary style, 1.5px ink border, NOT clay** (the header is sticky, so a clay CTA here would double up against each page's own primary CTA and blow the ≤2%-per-viewport ration; the mobile menu panel's CTA *is* clay, which is fine — the panel is full-screen, so it's the only clay in that view). Sticky, cream with mist hairline. Mobile: full-screen panel, 250ms.
  - 🆕 **Lead Engine is NOT a top-level nav item, and this is deliberate — do not "restore" it.** It was a peer of Home/About/Contact until 22 Jul 2026, when the repositioning demoted it from the spine of the company to one flagship example. That pass overshot and left it in *no* menu at all; 23 Jul put it back as the **featured row at the top of the Services dropdown panel**, carrying the "Start here" badge, plus the first entry in the footer's Services column (Cream, not the Indigo 200 link tone — it's the one packaged product, not a peer of the disciplines under it). The badge lives on that row **only**, never also on the AI Automation grid item: "Start here" pointing two places in one panel is no direction at all. See `CLAUDE.md` for the full rationale.
  - The dropdown lists all **11** services (two columns) beneath the featured row. Row descriptions come from `navLine` in `lib/services.ts` — a separate, ≤35-character field, not `oneLiner`; the panel truncates rather than wraps, so an over-budget line clips instead of silently making the panel taller.
- **Footer:** Indigo 900 full-bleed band, 4 columns — brand/slogan/Deb line, services (Lead Engine + top 5 + "All services →"), pages, contact + socials. Headings Cream, body Mist, links **Indigo 200** with hover underline (note: this is Indigo 200, not the Indigo 400 general dark-band link color from §1 — the footer gets its own lighter link tone, confirmed against the live `Footer.tsx`), contact line Cream. The fixed-price safety line appears once in the footer's bottom bar; total appearances per page ≤2 (footer + the page's final CTA band). Counts as the page's one dark band by default.

---

## 7. Conversion mechanics & content density (v2 §7, plus v2.1 additions)

- **Content density:** full-depth pages are the norm — homepage 10–13 sections, service pages ~8, every page ends in a CTA band.
- **Copy voice:** plain speech a non-technical owner understands on first read; short sentences; any technical term explained in the same breath; Deb presents outcomes, never tech; real names/numbers only, never invented.
- 🆕 **Copy scannability (v2.1):** no paragraph longer than 3 lines above the fold; bold the concrete numbers; every H2 should pass a 5-second test (a skimmer gets the point from headings alone).
- 🆕 **Low-commitment conversion path (v2.1):** WhatsApp deep link (`lib/site.ts`) as a secondary CTA in hero/proof/contact sections, plus a mobile sticky bar. Grain overlay at 3%.

---

## 8. Mascot canon — Deb (v1.1 §5–7, with mascot-slot guidance added by v2.1)

**Name:** Deb (from **DEB**ugSwift — the name was hiding in the wordmark; also a familiar Bengali name). Verified July 2026: no tech/automation product or mascot conflict found. Microcopy pattern: "Deb found it." / "Deb's on it." / "Nothing here — Deb checked twice." (404).

**Deb as product presenter:** products keep descriptive names; Deb fronts them in copy. Pattern: *"Deb answers in 10 seconds, even at 2am."* Deb speaks about the outcome, never about the tech.

**Personality (locked):** the fast, friendly expert who fixes what's broken. Default expression: alert, slightly smiling, confident. Curious — never confused, never anxious. The "thinking" pose is a confident chin-scratch with a slight smile ("hmm, found it"), not worry. Posture always leans forward or mid-motion. **Species rule that doubles as a brand rule:** real swifts cannot stand on flat ground — Deb is never posed standing idle like a pigeon. Flying, swooping, hovering, perched-and-leaning, clinging — never loitering.

**Form spec:**
- Chibi proportions: head ≈ 45–50% of total mass, oversized glossy eyes with catchlights, tiny beak.
- Identity elements: the 3-spike crest (most ownable silhouette element) + the deep forked tail + crescent scythe wings (exactly two).
- Killed from early drafts: circuit-board wing texture (relocated to the background pattern), heavy dark outlines, pigeon body, anxious expressions.

**Color spec:** body midtone Indigo 300 `#ABB6FE` → shadows Indigo 500 `#6467F2` → deep shadow Indigo 700 `#423EBA` → highlights Indigo 200 `#C9D1FF` → underbelly warm Cream `#F7F3EB` (ties Deb to the site background). Beak/feet: Charcoal, or Clay 500 if it tests well. Crest: Indigo 600–700.

**Three tiers (never downscale between them):**
1. **Hero 3D** — sculpt-quality render, soft matte feathers (not fur), studio lighting, no outlines. Hero, social video, explainers.
2. **Mid flat vector** — simple shading, minimal or no outline. Spot illustrations, blog headers, empty states.
3. **Flat mark** — the crescent-wing + forked-tail + crest silhouette reduced to one geometric glyph, single color. Favicon, app icon, tiny contexts. **✅ Shipped** (`app/icon.svg`, `favicon.ico`, `apple-icon`, manifest icons).

The logo swoosh stays as-is — a wing-mark distinct from the mascot is a healthy split (mark ≠ character; cf. GitHub).

**Status:** Tier-1 render set COMPLETE — 3 canon poses (hero hover · thinking chin-scratch · celebrate victory-V), stored in `public/deb/`, read-only. **The hero render is the master seed: every future Deb image starts by attaching it — never generate from text alone.** There are three poses and there is no fourth before revenue.

🆕 **Mascot slot guidance (v2.1) — treat the exact pixel values below as historical, not current.** The general pattern (hero = homepage hero overlapping a frame corner; thinking = diagnosis contexts like contact/404; celebrate = proof/indigo-band/post-submit contexts; one Deb per viewport, never clipped, never floating unanchored) still holds and matches the live site. But the specific clearance math has been superseded — `components/Deb.tsx` and `CLAUDE.md` now own the current formula (`≈ 0.893 × rendered width − 40px` as of this doc's merge date, itself already per-page-tuned in places per the comments in `app/page.tsx`/`app/about/page.tsx`/`app/contact/page.tsx`). **If you're placing Deb, read `components/Deb.tsx` and the placement comments in the page you're editing — not the numbers in this paragraph.**

### Generation prompt sheet (hero 3D tier)

Base prompt: *"3D character render of a cute stylized swift (bird), chibi proportions with large head and big glossy dark eyes with bright catchlights, tiny beak, small three-spike crest on head, sleek crescent-shaped wings, deep forked tail, soft matte feathers with plush tactile texture, periwinkle body (#ABB6FE) with deeper indigo shading (#6467F2), warm cream underbelly, subtle indigo-violet deep shadows, soft studio lighting, Pixar-quality character design, friendly confident slight smile, leaning forward mid-motion, clean solid light background, no outlines"*

Negative/avoid: fur strands, realistic bird anatomy, small beady eyes, circuit patterns, dark muddy shading, standing flat-footed idle pose, worried expression.

Rules learned from generating the canon set (apply to all future drip poses): (1) explicit limb accounting in the prompt ("exactly TWO wings — one folded, one at the chin") or the model invents extras; (2) stay near three-quarter view — front-on drifts proportions and face off-model; (3) describe the tail by shape ("two long slim pointed streamers, NOT fanned") — "forked" alone is ignored; (4) ban proportion drift by name ("do NOT make the body shorter or rounder"); (5) only anatomy errors and unreadable poses justify redos — minor per-frame variance is normal.

### Hero animation — "the debug loop" (~7s, deferred, never blocks anything)

A UI element in the hero glitches. Deb sweeps in from off-frame in one fast crescent arc, brakes to a hover, taps the element, the glitch snaps clean, Deb perches on the fixed element and gives a small satisfied nod, settles into an idle blink loop. The slogan performed wordlessly; doubles as the first shareable social clip.

**Status: consciously DEFERRED post-launch.** Attempted once, results were off-model. The site launches with the static hero PNG — video is polish, not plumbing. Retry notes if picked up again: image-to-video only with the master hero as BOTH first and last frame (pins the loop, fights morphing), shorter clips (4–5s), simpler action (hover + blink before any swoop), regenerate any take where the character morphs mid-clip.

---

## 9. Anti-AI checklist (final version — v2 §8, which superseded v1.1 §8)

Run on every page before shipping:

☐ No gradient mesh / aurora / glassmorphism / floating 3D shapes / drop shadows
☐ Cream base, not white; Ink, not black
☐ Clay ≤2% per viewport, one CTA per viewport
☐ Eyebrow + oversized display type present
☐ 12-column asymmetric layout actually used (no dead thirds) — **assessed at 1440px; at 390px content is centred by design (§2 mobile exception)**
☐ Exactly one intentional grid break per page
☐ At most one dark (Indigo 900) band per page
☐ No scroll-triggered reveals anywhere; reduced-motion collapses everything; Deb is the sole rich mover
☐ A real name, number, or outcome appears in the first screen
☐ Zero banned words: Elevate, Empower, Unlock, Transform, seamless, leverage
☐ Circuit pattern faint (≤8%) and off the bird
☐ Every color traceable to a token in §1
☐ Verified at 1440px AND 390px
☐ Passes the final test: "a human with taste made this"

---

## 10. Changelog

- **24 Jul 2026 — Rounds 8 & 9 sync.** This file had drifted two rounds behind the code and was actively mis-grading shipped work. Three corrections, all transcribed from live components: **§6** header nav rewritten (Lead Engine removed from top-level nav per the 22 Jul repositioning, re-placed as the Services-panel featured row per the 23 Jul correction; Blog and Tools added; `navLine` budget documented). **§2** gained the mobile-centring exception (owner's call, 22 Jul) — previously the doc's blanket "left-anchored, no centered heroes" made every page a violation at 390px. **§9** checklist's asymmetry item scoped to 1440px accordingly. No token, type, or component changes.
- **20 Jul 2026 — this merge.** `design-system-v1-1.md` + `design-system-v2.md` (which contained an embedded "v2.1" changelog from 11 July) combined into this single file. Two stale specifics flagged during the merge (§2 Numeral role, §4 Ledger List description) rather than silently corrected — see those sections. All references across the repo (`CLAUDE.md`, `.claude/skills/`, `.claude/agents/`, `.claude/rules/`, `debugswift-assets/`, `debugswift-master-brief-v6.md`, `app/kitchen-sink/page.tsx`) repointed to this file.
- **v2.1 (11 Jul 2026, Redesign Brief v1):** reversed v2's scroll-reveal motion system entirely; removed oversized ghost numerals in favor of the Ledger List archetype (itself redrawn again later, undocumented until now); defined section archetypes, icon rules, mascot slot guidance, footer refinements, conversion-mechanic additions, copy scannability rules.
- **v2 (10 Jul 2026, "Premium Amendment"):** wider canvas (1320px), 12-column editorial grid, Display-XL type, contrast fix for small text, dark-band rule, depth-without-shadows guidance, an elaborate scroll-reveal motion system (later reversed by v2.1), new nav/footer canon, content density canon.
- **v1.1 (Jul 2026):** old §9 (strategy deltas) removed, folded into the master brief instead. Added the Deb-as-product-presenter microcopy pattern. No visual/token changes from v1.
- **v1:** initial system (Chat 2 deliverable).
