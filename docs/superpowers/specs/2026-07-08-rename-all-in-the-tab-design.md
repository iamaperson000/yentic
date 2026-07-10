# Rename: Yentic → All in the Tab

**Date:** 2026-07-08
**Status:** Approved (name locked; user registering domains)

## Decision

Rename the product from **Yentic** to **All in the Tab** (domain: allinthetab.com).

## Why

- "Yentic" is one letter from **Jentic** (jentic.com), a funded Dublin AI-infrastructure startup in developer tooling, and phonetically identical in much of Europe. It also neighbors **Ydentic** (acquired by AvePoint, 2025). "Yentic" has no independent search footprint; it reads as a typo of someone else's brand.
- "All in the Tab" is the product's own promise (the phrase was already the hero kicker). Phrase-name precedent in dev tools: Read the Docs, Can I Use.
- Vetting (3 independent research passes, 2026-07-08):
  - **Collisions/trademarks:** clear — no company, product, extension, repo, or indexed trademark on the phrase, including software classes. (Certified USPTO search deferred; only needed if filing a mark.)
  - **Namespace:** entire domain perimeter unregistered (.com/.dev/.app/.io/.org, hyphenated, mishearings allonthetab.com and allinthetap.com); GitHub org, npm, and all conclusively-checkable @allinthetab handles free.
  - **Language:** phrase is clean in every language checked; bar-tab echo reads friendly for a free product. Weaknesses: prepositional-phrase grammar ("built it in All in the Tab" stutters) and the shorthand "the Tab" collides with The Tab (thetab.com, student news) — mitigated by treatment rules below.

## Name treatment rules

1. **Canonical name:** "All in the Tab" — title case with small words down, always the full phrase in headings, titles, metadata, handles, and third-party-facing copy.
2. **Wordmark:** lowercase "all in the tab" (matches the site's existing lowercase-eyebrow style).
3. **Nickname policy:** "the Tab" may appear only as playful in-product copy (e.g. status-bar flavor text). Never in handles, logos, SEO titles, or as a standalone brand — that name belongs to thetab.com in public mindshare.
4. **Grammar style guide:** avoid "in All in the Tab." Preferred constructions: "built **with** All in the Tab," "open All in the Tab," sentence-initial usage ("All in the Tab now supports Java"). Avoid possessive ("All in the Tab's") — rephrase ("the All in the Tab release" → "this release").
5. **Tagline:** the old hero kicker is now the name, so the hero subhead slot is filled by the existing line "a real IDE that opens like a new tab" (kept, possibly tightened during the copy-fix pass).

## Namespace actions (user, manual)

- Register: allinthetab.com (primary), allinthetab.dev, allinthetab.app, allonthetab.com (mishearing redirect). Optional: .io/.org/hyphenated/allinthetap.com.
- Claim GitHub org `allinthetab`; claim @allinthetab on YouTube, X, Bluesky, Instagram, TikTok, Twitch; create r/allinthetab.
- Point new domains at the Vercel deployment; keep **yentic.com as a 301 redirect** to allinthetab.com indefinitely.
- Set up email forwarding for hello@allinthetab.com (and keep hello@yentic.com forwarding) before the contact email changes in code.

## Codebase rename scope

23 files currently reference "Yentic" (~49 occurrences in src plus config, public, README):

- **Identity/config:** `package.json` (`"name"`), `src/config/site.ts` (marketingUrl → allinthetab.com, contactEmail → hello@allinthetab.com, githubUrl → new org/repo).
- **Metadata:** `src/app/layout.tsx` (title "Yentic — a real IDE that runs in your browser", OG/description).
- **Marketing copy:** homepage/hero (the kicker "WRITE IT · RUN IT · SHARE IT · ALL IN THE TAB" is superseded by the name itself — rework, don't duplicate), MarketingNav, SiteFooter, HomeSections, HeroBackdrop, roadmap/signup/terms pages.
- **App surfaces:** ide/page, collab pages/Room, setup-profile, users, WorkspaceClient, Editor, api/message.
- **Starter templates:** `src/lib/project.ts` ("Hello from Yentic" strings in every language template).
- **Styling/tokens:** `src/lib/theme.ts`, `src/app/globals.css` (verify whether references are comments or user-visible).
- **Static:** `public/chat.html`, `public/ide-mockup.html`, `README.md`.

## External/infra scope (coordinated, not in the code PR)

- GitHub: rename/transfer repo to the `allinthetab` org; update remotes.
- Google OAuth (NextAuth): add new-domain redirect URIs before DNS cutover; keep yentic.com URIs until redirect period ends.
- Vercel: add new domains to the project; set yentic.com → 301.
- Any hardcoded callback/env URLs (`NEXTAUTH_URL` in deployment env).

## Name governance (adversarial review, 2026-07-09)

The name survived two multi-agent challenges: a naming tournament (tab.new
died on $412/yr registry pricing + Google's .new creation-flow policy;
tab.town on bare-"Tab" collision concentration; "Just Press Run" survived as
tagline only) and an expansion-risk trial (prosecution/defense/judge).
Binding prescriptions from the ruling:

1. **Rename tripwire (pre-committed):** if server-side execution exceeds a
   meaningful share of runs, or a native (non-shell) client becomes the
   primary surface, we rename. Gitpod→Ona proves this is survivable later.
2. **Fallback domain:** register one container-neutral domain now (~$15/yr)
   and park it, so the year-5 rename option is bought at year-0 prices.
3. **Server-side execution ships as a labeled exception** ("for languages
   that can't live in the tab yet"), never as a silent contradiction.
4. **PWA install is branded "the tab, installed"** (StackBlitz precedent);
   any future shell uses the GitHub template: "All in the Tab Desktop."
5. **SEO: claim the exact 4-gram within 90 days of launch** (site, repo,
   packages, launch posts use the exact phrase); monitor navigational
   queries for tab-manager/guitar-tab bleed at 90 days.

Tagline locked: "Just press Run." (justpressrun.com worth registering as
slogan insurance). Canonical preposition: built **on** All in the Tab.

## Interaction with the copy audit (2026-07-08)

The rename touches many of the same lines as the 64-finding copy audit. Do the rename **first** (mechanical, well-scoped), then the copy fixes — so audit fixes are written once, in the new voice. Exception: audit items on lines the rename rewrites anyway (hero kicker, footer tagline) are resolved as part of the rename.

## Out of scope

- Logo/visual identity beyond the text wordmark.
- Trademark filing.
- The copy-audit fixes (tracked separately).

## Testing

- `npm run lint` and `npm test` pass after rename.
- `grep -ri yentic src/ public/ README.md package.json` returns zero user-visible hits (git history and this spec excepted).
- Manual: homepage, IDE, signup, and share-modal render the new name; OAuth login still works on the old domain until cutover.
