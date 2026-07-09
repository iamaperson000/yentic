# Rename Yentic → All in the Tab: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every user-visible "Yentic" with "All in the Tab" across the codebase, per the approved spec at `docs/superpowers/specs/2026-07-08-rename-all-in-the-tab-design.md`.

**Architecture:** Pure copy/config rename — no logic changes. Internal identifiers (localStorage keys, Monaco theme ids, globals, room ids) are deliberately KEPT to avoid destroying user data. Tasks are grouped by surface so each commit renders correctly on its own.

**Tech Stack:** Next.js 16 App Router, React 19. Dev server already running at localhost:3000 (custom `server.js`).

## Global Constraints

- Canonical name: **"All in the Tab"** (title case, small words down) in prose/titles; lowercase **"all in the tab"** as wordmark in nav/footer/status-bar brand slots.
- Never write "in All in the Tab"; prefer "with All in the Tab" or sentence-initial. No possessive "All in the Tab's".
- Article rule: "**an** All in the Tab account" (an, not a).
- New domain: `allinthetab.com`; new email: `hello@allinthetab.com`; new GitHub: `https://github.com/allinthetab/allinthetab`.
- **DO NOT rename** (user-data/internal): `yentic-theme`, `yentic.project.v1`, `yentic.workspace.v1`, `yentic.workspace.meta.v1` localStorage keys; `__yenticChatRateLimit` global; Monaco theme ids `yentic-dusk`/`yentic-day` and the `registerYenticThemes`/`currentYenticTheme` functions; Liveblocks room id `yentic-collab-room`; the `.yide` CSS class and `--y-*` CSS variables.
- No unit tests exist for copy; each task's verify cycle is: targeted `grep` (expect zero user-visible hits in the touched files) + `npm run lint` + curl of the rendered page where applicable. `npm test` runs once in the final task.

---

### Task 1: Identity core (config, metadata, package, README)

**Files:**
- Modify: `src/config/site.ts:2-5`
- Modify: `src/app/layout.tsx:15`
- Modify: `package.json:2`
- Modify: `README.md:1-3`

**Interfaces:**
- Produces: `site.name === 'All in the Tab'`, `site.contactEmail === 'hello@allinthetab.com'` — Task 3 imports `site` from `@/config/site` for the IDE-page mailto links.

- [ ] **Step 1: Update `src/config/site.ts`**

```ts
export const site = {
  name: 'All in the Tab',
  marketingUrl: 'https://allinthetab.com',
  contactEmail: 'hello@allinthetab.com',
  githubUrl: 'https://github.com/allinthetab/allinthetab'
} as const;
```

(Leave `export type SiteConfig = typeof site;` untouched.)

- [ ] **Step 2: Update root metadata title in `src/app/layout.tsx:15`**

Old: `title: 'Yentic — a real IDE that runs in your browser',`
New: `title: 'All in the Tab — a real IDE in your browser',`

Do NOT touch line 36 (`localStorage.getItem('yentic-theme')` — protected key).

- [ ] **Step 3: Update `package.json:2`**

Old: `"name": "yentic",`
New: `"name": "allinthetab",`

- [ ] **Step 4: Update `README.md` heading and intro**

Old:
```md
# Yentic

Yentic is a browser-based IDE built with Next.js, Monaco, Prisma, NextAuth, and Yjs over Liveblocks. It includes project persistence, shareable project links, collaborative editing primitives, and a small Pusher-backed chat demo.
```
New:
```md
# All in the Tab

All in the Tab is a browser-based IDE built with Next.js, Monaco, Prisma, NextAuth, and Yjs over Liveblocks. It includes project persistence, shareable project links, collaborative editing primitives, and a small Pusher-backed chat demo.
```

- [ ] **Step 5: Verify**

Run: `grep -n 'Yentic\|yentic' src/config/site.ts package.json README.md; grep -n 'Yentic' src/app/layout.tsx`
Expected: no output.
Run: `npm run lint`
Expected: passes (or only pre-existing warnings).
Run: `curl -s localhost:3000 | grep -o '<title>[^<]*</title>'`
Expected: `<title>All in the Tab — a real IDE in your browser</title>`

- [ ] **Step 6: Commit**

```bash
git add src/config/site.ts src/app/layout.tsx package.json README.md
git commit -m "Rename: identity core (site config, metadata, package, README)"
```

---

### Task 2: Marketing surface (nav, hero, footer, subpages)

**Files:**
- Modify: `src/app/(marketing)/MarketingNav.tsx:43`
- Modify: `src/app/(marketing)/page.tsx:17-21`
- Modify: `src/components/marketing/SiteFooter.tsx:79`
- Modify: `src/components/marketing/HomeSections.tsx:138`
- Modify: `src/components/marketing/HeroBackdrop.tsx:51` (comment)
- Modify: `src/app/(marketing)/signup/page.tsx:56`
- Modify: `src/app/(marketing)/roadmap/page.tsx:58`
- Modify: `src/app/(marketing)/terms/page.tsx:12,17,22,27`

**Interfaces:** none (leaf copy).

- [ ] **Step 1: Nav wordmark, `MarketingNav.tsx:43`**

Old: `yentic`
New: `all in the tab`
(Only the visible text node changes; leave surrounding JSX as is.)

- [ ] **Step 2: Hero kicker, `page.tsx:17-21`**

The kicker's fourth beat is now the product name shown in the nav directly above — drop it (this also resolves the copy-audit finding on this line). Replace the `<p>` contents:

Old:
```jsx
WRITE IT <span style={{ color: 'rgba(236,231,222,.35)' }}>·</span> RUN IT{' '}
<span style={{ color: 'rgba(236,231,222,.35)' }}>·</span> SHARE IT{' '}
<span style={{ color: 'rgba(236,231,222,.35)' }}>·</span> ALL IN THE TAB
```
New:
```jsx
WRITE IT <span style={{ color: 'rgba(236,231,222,.35)' }}>·</span> RUN IT{' '}
<span style={{ color: 'rgba(236,231,222,.35)' }}>·</span> SHARE IT
```

Leave the subhead at line 40 ("a real IDE that opens like a new tab — no install, nothing to configure") exactly as is — per spec it is the tagline.

- [ ] **Step 3: Footer wordmark, `SiteFooter.tsx:79`**

Old: `<span className="ml-auto" style={{ color: 'var(--y-brand)' }}>yentic</span>`
New: `<span className="ml-auto" style={{ color: 'var(--y-brand)' }}>all in the tab</span>`

- [ ] **Step 4: Share-link mockup text, `HomeSections.tsx:138`**

Old: `<span style={{ color: 'var(--y-fg)' }}>yentic.com/p/3f9a2c</span>`
New: `<span style={{ color: 'var(--y-fg)' }}>allinthetab.com/p/3f9a2c</span>`

- [ ] **Step 5: Comment, `HeroBackdrop.tsx:51`**

Old: ` * The B4 hero atmosphere: Yentic's own syntax-highlighted code blurred into a`
New: ` * The B4 hero atmosphere: the site's own syntax-highlighted code blurred into a`

- [ ] **Step 6: Signup headline, `signup/page.tsx:56`**

Old: `Join Yentic and start building.`
New: `Join All in the Tab and start building.`

- [ ] **Step 7: Roadmap title, `roadmap/page.tsx:58`**

Old: `title="Where Yentic is headed."`
New: `title="What's next for All in the Tab."`
("Where All in the Tab is headed" garden-paths on "where all"; the style guide prefers the name after "for".)

- [ ] **Step 8: Terms copy, `terms/page.tsx` (4 strings)**

Line 12 old: `'By creating a Yentic account or using the platform, …'`
Line 12 new: `'By creating an All in the Tab account or using the platform, …'` (note **an**)
Line 17: `…to use Yentic.` → `…to use All in the Tab.`
Line 22: `Use Yentic responsibly.` → `Use All in the Tab responsibly.`
Line 27: `…you grant Yentic a limited license…` → `…you grant All in the Tab a limited license…`
(Only the word swaps shown; keep the rest of each sentence byte-identical.)

- [ ] **Step 9: Verify**

Run: `grep -rn 'Yentic\|yentic' 'src/app/(marketing)/' src/components/marketing/`
Expected: no output.
Run: `npm run lint`
Expected: passes.
Run: `curl -s localhost:3000 | grep -c 'all in the tab'` and `curl -s localhost:3000/terms | grep -c 'an All in the Tab account'`
Expected: ≥1 for each.

- [ ] **Step 10: Commit**

```bash
git add 'src/app/(marketing)' src/components/marketing
git commit -m "Rename: marketing surface (nav, hero kicker, footer, subpages)"
```

---

### Task 3: App surfaces (IDE launcher, workspace, profile, users, collab demo)

**Files:**
- Modify: `src/app/ide/page.tsx:83,176,184,196-197,201` (+ add import)
- Modify: `src/components/WorkspaceClient.tsx:1531`
- Modify: `src/app/setup-profile/page.tsx:49`
- Modify: `src/app/users/page.tsx:72`
- Modify: `src/app/collab-demo/page.tsx:6`

**Interfaces:**
- Consumes: `site.contactEmail` from `@/config/site` (Task 1).

- [ ] **Step 1: IDE launcher, `src/app/ide/page.tsx`**

Add at top with the other imports: `import { site } from '@/config/site';`

Line 83 old: `<span className="flex items-center gap-2" style={{ color: 'var(--y-brand)' }}>yentic ide</span>`
Line 83 new: `<span className="flex items-center gap-2" style={{ color: 'var(--y-brand)' }}>all in the tab</span>`

Line 176 old: `href="mailto:hello@yentic.com?subject=Language%20request"`
Line 176 new: `` href={`mailto:${site.contactEmail}?subject=Language%20request`} ``

Line 184 old: `Tell us what to add — <span style={{ color: 'var(--y-brand)' }}>hello@yentic.com</span>`
Line 184 new: `Tell us what to add — <span style={{ color: 'var(--y-brand)' }}>{site.contactEmail}</span>`

Lines 196-197 old: `href="mailto:hello@yentic.com"` … `hello@yentic.com`
Lines 196-197 new: `` href={`mailto:${site.contactEmail}`} `` … `{site.contactEmail}`

Line 201 old: `<span style={{ color: 'var(--y-brand)' }}>yentic ide</span>`
Line 201 new: `<span style={{ color: 'var(--y-brand)' }}>all in the tab</span>`

- [ ] **Step 2: Workspace status-bar brand, `WorkspaceClient.tsx:1531`**

Old: `<span className="sq" />yentic`
New: `<span className="sq" />all in the tab`

- [ ] **Step 3: Setup-profile heading, `setup-profile/page.tsx:49`**

Old: `Create your Yentic handle`
New: `Choose your username`
(This line is rewritten anyway; per spec, the audit finding on it — "handle" vs the form's "username" — is resolved here.)

- [ ] **Step 4: Users directory, `users/page.tsx:72`**

Old: `Discover builders across Yentic.`
New: `See who's building with All in the Tab.`
("across All in the Tab" garden-paths on "across all"; style guide prefers "with".)

- [ ] **Step 5: Collab demo metadata, `collab-demo/page.tsx:6`**

Old: `title: 'Yentic — Live Collaboration Demo',`
New: `title: 'All in the Tab — Live Collaboration Demo',`

- [ ] **Step 6: Verify**

Run: `grep -n 'Yentic\|yentic' src/app/ide/page.tsx src/app/setup-profile/page.tsx src/app/users/page.tsx src/app/collab-demo/page.tsx && echo FAIL || echo CLEAN`
Expected: `CLEAN`
Run: `grep -cn 'yentic' src/components/WorkspaceClient.tsx`
Expected: `0`
Run: `npm run lint`
Expected: passes.
Run: `curl -s localhost:3000/ide | grep -c 'all in the tab'`
Expected: ≥1. Also confirm `curl -s localhost:3000/ide | grep -c 'hello@allinthetab.com'` ≥1.

- [ ] **Step 7: Commit**

```bash
git add src/app/ide/page.tsx src/components/WorkspaceClient.tsx src/app/setup-profile/page.tsx src/app/users/page.tsx src/app/collab-demo/page.tsx
git commit -m "Rename: app surfaces (IDE launcher, workspace brand, profile, users, collab demo)"
```

---

### Task 4: Starter templates, CSS comments, static HTML

**Files:**
- Modify: `src/lib/project.ts:136,155,163,171,179,187` (KEEP lines 33-35 key prefixes)
- Modify: `src/app/globals.css:3,64,287` (comments only)
- Modify: `public/chat.html:6`
- Modify: `public/ide-mockup.html:6,141,287`

**Interfaces:** none (leaf copy). Template strings feed the user's starter files — they must stay compilable in their language.

- [ ] **Step 1: Starter templates, `src/lib/project.ts`**

Line 136 old: `<title>Yentic Starter</title>` → new: `<title>All in the Tab Starter</title>`

Line 155 (inside the JS template string) old fragment:
`'<h1>Yentic</h1><p>A classic-feeling web IDE without the bloat.</p><button id="btn">Click me</button><pre id="out"></pre>'`
new fragment:
`'<h1>All in the Tab</h1><p>Edit index.js, then click Run.</p><button id="btn">Click me</button><pre id="out"></pre>'`
(Also resolves the audit finding about the marketing tagline baked into starter output.)

Line 163 old: `'# main.py\n"""Start building with Python in Yentic."""\n\nif __name__ == "__main__":\n    print("Hello from Yentic 👋")\n'`
Line 163 new: `'# main.py\n"""Start building with Python."""\n\nif __name__ == "__main__":\n    print("Hello from All in the Tab!")\n'`
(Emoji dropped for cross-language consistency — audit finding on this exact line.)

Lines 171, 179, 187: replace `Hello from Yentic!` with `Hello from All in the Tab!` in the C, C++, and Java templates (one occurrence each; everything else byte-identical).

Do NOT touch lines 33-35 (`yentic.project.v1` etc. — protected storage keys).

- [ ] **Step 2: CSS comments, `src/app/globals.css`**

Line 3: `/* ── Yentic editor-identity tokens (redesign) ── */` → `/* ── Editor-identity tokens (redesign) ── */`
Line 64: `/* Yentic Dusk IDE — warm, …` → `/* Dusk IDE — warm, …` (rest unchanged)
Line 287: `/* ── Yentic IDE skin — lifted verbatim from the approved mockup, scoped under .yide ── */` → `/* ── IDE skin — lifted verbatim from the approved mockup, scoped under .yide ── */`

- [ ] **Step 3: Static HTML, `public/`**

`chat.html:6` old: `<title>Yentic Collaborative Chatroom</title>` → new: `<title>All in the Tab — Collaborative Chat</title>`
`ide-mockup.html:6` old: `<title>Yentic IDE — interactive mockup</title>` → new: `<title>All in the Tab — interactive mockup</title>`
`ide-mockup.html:141` old: `<div class="brand"><span class="sq"></span>yentic</div>` → new: `<div class="brand"><span class="sq"></span>all in the tab</div>`
`ide-mockup.html:287` old: `"scripts": { "dev": "yentic serve" }` → new: `"scripts": { "dev": "aitt serve" }` (fake CLI text in mockup content)

- [ ] **Step 4: Verify**

Run: `grep -n 'Yentic' src/lib/project.ts src/app/globals.css public/chat.html public/ide-mockup.html && echo FAIL || echo CLEAN`
Expected: `CLEAN`
Run: `grep -c 'yentic\.' src/lib/project.ts`
Expected: `3` (the three protected storage-key prefixes remain).
Run: `npm run lint`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/project.ts src/app/globals.css public/chat.html public/ide-mockup.html
git commit -m "Rename: starter templates, CSS comments, static HTML"
```

---

### Task 5: Full-repo verification sweep

**Files:** none new — verification only, plus fixes for any stragglers found.

- [ ] **Step 1: Repo-wide grep**

Run: `grep -rni 'yentic' src/ public/ README.md package.json --color=never`
Expected — ONLY these internal identifiers (any other hit is a straggler; fix it using the treatment rules above and amend the relevant commit):
- `src/app/layout.tsx:36` — `yentic-theme` localStorage key
- `src/lib/theme.ts:17` — `yentic-theme` localStorage key
- `src/lib/project.ts:33-35` — storage key prefixes
- `src/app/api/message/route.js:18-19` — `__yenticChatRateLimit`
- `src/app/collab/Room.tsx:13` — `yentic-collab-room` room id
- `src/components/Editor.tsx` (multiple) — Monaco theme ids/functions

- [ ] **Step 2: Lint and tests**

Run: `npm run lint && npm test`
Expected: both pass.

- [ ] **Step 3: Rendered smoke test (dev server on :3000)**

```bash
curl -s localhost:3000 | grep -o '<title>[^<]*</title>'          # All in the Tab — a real IDE in your browser
curl -s localhost:3000/signup | grep -c 'Join All in the Tab'    # ≥1
curl -s localhost:3000/ide | grep -c 'all in the tab'            # ≥1
curl -s localhost:3000/users | grep -c "building with All in the Tab"  # ≥1 (or DB-gated notice; either is fine)
```
Also verify no page shows "in All in the Tab" (the banned construction): `curl -s localhost:3000 localhost:3000/features localhost:3000/signup | grep -c 'in All in the Tab'` → expected `0`.

- [ ] **Step 4: Commit any straggler fixes**

```bash
git add -A && git commit -m "Rename: verification sweep fixes" # only if stragglers were found
```

---

## Manual actions (user — outside this plan)

Before deploying this branch: register allinthetab.com/.dev/.app (+ allonthetab.com), create the `allinthetab` GitHub org and transfer the repo (site footer will link there), add new-domain redirect URIs to Google OAuth, add domains to Vercel with yentic.com → 301, set up hello@allinthetab.com forwarding.
