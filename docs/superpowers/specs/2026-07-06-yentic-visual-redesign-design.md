# Yentic Visual Redesign — Design Spec

**Date:** 2026-07-06
**Branch:** `redesign-editor-identity`
**Status:** Approved (design direction locked; copy may still be tuned)

## Problem

The current site reads as generic "AI-generated dark SaaS": near-black `#08090a` + a
single emerald accent + radial glow + grid/dot texture overlays on everything +
`rounded-full` white pills + `uppercase tracking-[0.2em]` micro-labels. The homepage
and the signed-in projects page were both called out as ugly, and the marketing copy
is filler (a hero stuffed with ~30 fragments of hedgy prose that says almost nothing).

The goal: give Yentic a real, distinctive visual identity and rebuild these surfaces
around it, with copy cut to a human voice.

## Subject & positioning

Yentic is a **browser IDE that runs code in the tab itself** (Pyodide/WASM for Python,
Sandpack for web — genuinely client-side, no server sandbox). Audience: developers,
students, and tinkerers who want zero-setup coding and a shareable link. The page's job:
convince a developer they can be writing running code in this tab immediately.

## The identity — "the page is an editor"

A code editor's identity, more than almost any product, *is its theme* (cf. Dracula,
Nord, Solarized). So the concept is: **Yentic ships with a signature theme, and the
marketing surfaces wear it.** The site presents as an editor session rather than putting
a screenshot of an editor onto a conventional landing page.

Signature elements:
- **A line-number gutter as the page's left spine.**
- **Editor chrome:** a top bar with a mono wordmark, real file tabs (`welcome.py`),
  and a **VS Code-style status bar footer** (`welcome.py · Python 3.12 · Ln 15, Col 22 ·
  runs in-browser · UTF-8 · ⧉ share`).
- **Code is the hero visual, and it runs.** The hero contains a live editor block whose
  output actually renders (a real demo of the in-tab execution that makes Yentic
  special), not a static screenshot.
- **A "selected text" headline moment:** the key phrase is treated like text selected in
  an editor — a highlight block plus a live caret — so the brand's voice behaves like the
  product.
- **Projects page = a workspace explorer** (file-tree sidebar + `name/main.py` rows with
  runtime tags and keyboard hints), NOT a grid of textured dark cards.

### Design tokens

**Default theme = "Dusk" (warm dark).** A light "Daylight" theme is a first-class
alternate (the theme toggle is part of the brand). Deliberately avoids the three current
AI defaults (cream+serif+terracotta; near-black+acid-green; broadsheet hairline columns).

Dusk:
```
--ink:#16141a   (warm near-black, slight plum — NOT the cool #08090a)
--panel:#1d1a22   --panel2:#221e28   --line:#2c2833
--fg:#ece7de (warm off-white)   --muted:#847e74   --gutter-num:#4a4550
--brand:#f0a840 (marigold — buttons, wordmark, active tab, status bar)
syntax palette (functional, not decorative):
  --kw:#ff8489  --str:#8ee06f  --fn:#f0a840  --num:#79c0ff  --op:#c9a2ff
--selection-hl:rgba(240,168,64,.24)   --selection-tint:rgba(240,168,64,.12)
```

Daylight:
```
--ink:#f7f3ea (warm white, NOT cream #F4F1EA)   --panel:#efe9db   --panel2:#e8e1d0
--line:#ddd4c1   --fg:#211e18   --muted:#8c8473
--brand:#c17615 (deeper amber for light-bg contrast)
--kw:#c0355a  --str:#2f8a45  --fn:#c17615  --num:#2d5bd6  --op:#8043c9
```

The single accent is **marigold**, used sparingly. Color otherwise reads as a functional
syntax palette, which is on-brand for an editor.

### Typography (three deliberate roles)

- **Display:** Bricolage Grotesque (700/800) — humanist, opinionated; carries personality.
- **Body:** Hanken Grotesk (400/500/600).
- **Mono:** JetBrains Mono — code, labels, eyebrows, status bar, wordmark.

Loaded via `next/font/google` (the app currently uses Geist via `--font-geist-*`; we add
these families as CSS variables). Type treatment itself is a feature (the highlighted
headline phrase), not a neutral delivery vehicle.

### Copy

- **Headline:** "Your dev environment is now a URL." (the phrase "now a URL" gets the
  editor-selection highlight + caret).
- **Tagline:** "write it, run it, share it — all in the tab" (lowercase kept intentionally
  for voice).
- **Principle:** every string gets a human pass. Kill the tells — em-dash drama,
  "in seconds," negation-lists ("no install, no server"), personification, feature-dump
  bullet lists. Prefer plain concrete verbs; name things from the user's side.
- Parked line for later use (features section / empty state / social):
  **"Localhost, without the local."** (see `.superpowers/brainstorm/copy-parking-lot.md`).

## Scope

**In scope (this pass):**
1. Shared design tokens in `src/app/globals.css` — replace the current token block with
   Dusk/Daylight; wire fonts.
2. **Landing homepage** (`src/app/(marketing)/page.tsx` `LandingHome`) — rebuild as the
   editor-session hero + status bar; cut the `heroHighlights` / `workflowSteps` /
   `featureColumns` filler down to the tagline + a real live-code visual + at most three
   concrete capabilities.
3. **Projects page** (`src/components/home/SignedInHomeShell.tsx`) — rebuild as the
   workspace-explorer layout in the new theme (keep all existing behavior: load/search/
   create/rename/delete/share, owned/shared scopes, modals).
4. **Marketing shell** (`MarketingNav.tsx`, `(marketing)/layout.tsx`) — restyle nav to the
   new identity; remove the jarring dark→light `#dce5f0` section flip.
5. Theme mechanism: a light/dark toggle backed by a CSS `data-theme` attribute + the token
   sets above. Default = Dusk.

**Out of scope (follow-on, noted so we don't forget):**
- The IDE workspace chrome itself (`.ide-shell` tokens, `WorkspaceClient`, `Editor`,
  `Preview`) — it already has its own VS-Code-like theme; align it later.
- The known **Liveblocks room-id bug** (client sends `project-<collaborationKey>` but auth
  looks up by `id` → realtime collab silently broken). Real bug, but a functionality fix,
  not this redesign. Track separately.
- Marketing sub-pages (`features`, `roadmap`, `privacy`, `terms`, `signup`) beyond nav
  restyle + copy cleanup.
- Dead code removal (`ExecutablePreview.tsx` unused, stale README WebRTC claims) — nice to
  fold in opportunistically but not the point.

## Constraints / non-negotiables

- Preserve all existing functionality and data flow in the projects page and marketing
  routing; this is a visual + copy reskin, not a behavior change.
- Quality floor: responsive to mobile, visible keyboard focus, `prefers-reduced-motion`
  respected (the blinking caret and theme transition must honor it).
- No new heavy dependencies; fonts via `next/font`, styling via existing Tailwind v4 setup.
- Don't overclaim in copy: C/C++/Java "execution" is regex-transpiled, not real
  compilation — copy should say "run" honestly and not imply full native compilation.

## Success criteria

- Homepage and projects page no longer read as templated dark-SaaS; they present the
  editor identity with the gutter spine, status bar, live-code hero, and explorer.
- Marigold-on-Dusk default with a working Daylight toggle.
- Bricolage/Hanken/JetBrains Mono type in place.
- All prior projects-page behavior still works.
- Copy is human throughout the touched surfaces.
