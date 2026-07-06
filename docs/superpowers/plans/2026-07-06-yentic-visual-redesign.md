# Yentic Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Yentic's homepage, signed-in projects page, and marketing shell around an "the page is an editor" visual identity (warm Dusk default + Daylight toggle, Bricolage/Hanken/JetBrains Mono type, editor chrome), with human-voice copy — without changing any existing behavior.

**Architecture:** A new CSS-variable token system (`--y-*`) in `globals.css`, themed via a `data-theme` attribute on `<html>` (default `dusk`, alternate `daylight`), set pre-paint to avoid flash. Fonts load through `next/font/google`. Small shared "editor chrome" presentational components (`GutterSpine`, `StatusBar`) are reused by the hero and the projects explorer. The existing marketing `--color-*` tokens stay intact so untouched sub-pages don't break; redesigned surfaces use `--y-*`.

**Tech Stack:** Next.js 16 (App Router) / React 19, Tailwind CSS v4 (`@theme inline` in `globals.css`), `next/font/google`, `next-auth`, existing `node:test` (`tsx --test`) + Playwright suites.

## Global Constraints

- Node `>=20.9.0`; no new heavy dependencies. Fonts via `next/font/google` only. (spec: Constraints)
- Default theme is **Dusk (dark)**; **Daylight (light)** is a first-class toggle. (spec: Design tokens)
- Dusk tokens (verbatim): `--ink:#16141a` `--panel:#1d1a22` `--panel2:#221e28` `--line:#2c2833` `--fg:#ece7de` `--muted:#847e74` `--gnum:#4a4550` `--brand:#f0a840` `--kw:#ff8489` `--str:#8ee06f` `--fn:#f0a840` `--num:#79c0ff` `--op:#c9a2ff`; selection `rgba(240,168,64,.24)` / tint `rgba(240,168,64,.12)`.
- Daylight tokens (verbatim): `--ink:#f7f3ea` `--panel:#efe9db` `--panel2:#e8e1d0` `--line:#ddd4c1` `--fg:#211e18` `--muted:#8c8473` `--gnum:#c3bba8` `--brand:#c17615` `--kw:#c0355a` `--str:#2f8a45` `--fn:#c17615` `--num:#2d5bd6` `--op:#8043c9`.
- Type roles: display = **Bricolage Grotesque**, body = **Hanken Grotesk**, mono = **JetBrains Mono**. (spec: Typography)
- Copy: headline **"Your dev environment is now a URL."** ("now a URL" highlighted + caret); tagline **"write it, run it, share it — all in the tab"** (lowercase kept). No em-dash drama, no "in seconds", no negation-lists, no personification, no feature-dump bullets. (spec: Copy)
- Preserve ALL existing behavior/data flow on the projects page and marketing routing — visual + copy reskin only. (spec: Constraints)
- Quality floor: responsive to mobile, visible keyboard focus, `prefers-reduced-motion` disables the caret blink and theme transition. (spec: Constraints)
- Don't overclaim: C/C++/Java run is regex-transpiled, not real compilation — say "run", never "compile natively". (spec: Constraints)
- Existing test suites (`npm test`, `npm run test:e2e`) must stay green; the `/ide` picker headings "Pick a workspace." and "HTML / CSS / JS" and all IDE `data-testid`s are out of scope — do not touch them.

---

### Task 1: Design tokens + fonts

**Files:**
- Modify: `src/app/globals.css` (top token block, after `@import "tailwindcss";`)
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: CSS custom properties `--y-ink --y-panel --y-panel2 --y-line --y-fg --y-muted --y-gnum --y-brand --y-kw --y-str --y-fn --y-num --y-op --y-sel-hl --y-sel-tint` scoped to `:root` (Dusk) and `[data-theme="daylight"]`; font CSS vars `--font-display --font-body --font-mono-code`. These are consumed by Tasks 3–6 as `var(--y-*)` / `var(--font-*)`.

- [ ] **Step 1: Add the token block to `globals.css`**

Insert directly after the existing `@import "tailwindcss";` line (keep everything else in the file unchanged):

```css
/* ── Yentic editor-identity tokens (redesign) ── */
:root {
  --y-ink:#16141a; --y-panel:#1d1a22; --y-panel2:#221e28; --y-line:#2c2833;
  --y-fg:#ece7de; --y-muted:#847e74; --y-gnum:#4a4550;
  --y-brand:#f0a840;
  --y-kw:#ff8489; --y-str:#8ee06f; --y-fn:#f0a840; --y-num:#79c0ff; --y-op:#c9a2ff;
  --y-sel-hl:rgba(240,168,64,.24); --y-sel-tint:rgba(240,168,64,.12);
  --y-statfg:#1a130a; --y-console-bg:#100e13;
}
[data-theme="daylight"] {
  --y-ink:#f7f3ea; --y-panel:#efe9db; --y-panel2:#e8e1d0; --y-line:#ddd4c1;
  --y-fg:#211e18; --y-muted:#8c8473; --y-gnum:#c3bba8;
  --y-brand:#c17615;
  --y-kw:#c0355a; --y-str:#2f8a45; --y-fn:#c17615; --y-num:#2d5bd6; --y-op:#8043c9;
  --y-sel-hl:rgba(193,118,21,.20); --y-sel-tint:rgba(193,118,21,.10);
  --y-statfg:#fdf6ea; --y-console-bg:#eef0e4;
}
@media (prefers-reduced-motion: reduce) {
  .y-caret { animation: none !important; }
}
```

- [ ] **Step 2: Wire fonts in `layout.tsx`**

Replace the Geist imports/usage. New top of file:

```tsx
import './globals.css';

import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import type { Metadata } from 'next';

import { CommandPalette } from '@/components/CommandPalette';
import SessionWrapper from '@/components/SessionWrapper';

const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['500', '700', '800'], variable: '--font-display' });
const body = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body' });
const monoCode = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-mono-code' });
```

Update `metadata` and `<html>`:

```tsx
export const metadata: Metadata = {
  title: 'Yentic — a real IDE that runs in your browser',
  description: 'Write, run, and share code — all in a browser tab. Python, C, C++, Java, and web, no install.',
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dusk"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${monoCode.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('yentic-theme');document.documentElement.dataset.theme=(t==='daylight'||t==='dusk')?t:'dusk';}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-screen antialiased" style={{ fontFamily: 'var(--font-body)' }}>
        <SessionWrapper>
          <CommandPalette />
          {children}
        </SessionWrapper>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify build/lint and existing tests are unaffected**

Run: `npm run lint && npm test`
Expected: lint passes; all `node:test` suites PASS (token/font changes touch no tested logic).

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat(redesign): add editor-identity tokens + fonts, default Dusk theme"
```

---

### Task 2: Theme toggle

**Files:**
- Create: `src/lib/theme.ts`
- Create: `tests/theme.test.ts`
- Create: `src/components/ThemeToggle.tsx`

**Interfaces:**
- Produces: `type Theme = 'dusk' | 'daylight'`; `nextTheme(current: Theme): Theme`; `applyTheme(theme: Theme): void` (sets `document.documentElement.dataset.theme` + writes `localStorage['yentic-theme']`); `readTheme(): Theme` (reads the same, defaults `'dusk'`). React component `ThemeToggle` (default export) consumed by the nav in Task 5.

- [ ] **Step 1: Write the failing test**

```ts
// tests/theme.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextTheme } from '../src/lib/theme';

test('nextTheme flips dusk -> daylight and back', () => {
  assert.equal(nextTheme('dusk'), 'daylight');
  assert.equal(nextTheme('daylight'), 'dusk');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/theme.test.ts`
Expected: FAIL — cannot find module `../src/lib/theme`.

- [ ] **Step 3: Implement `src/lib/theme.ts`**

```ts
export type Theme = 'dusk' | 'daylight';

export function nextTheme(current: Theme): Theme {
  return current === 'dusk' ? 'daylight' : 'dusk';
}

export function readTheme(): Theme {
  if (typeof document === 'undefined') return 'dusk';
  const t = document.documentElement.dataset.theme;
  return t === 'daylight' ? 'daylight' : 'dusk';
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('yentic-theme', theme); } catch { /* ignore */ }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/theme.test.ts`
Expected: PASS (2 assertions).

- [ ] **Step 5: Implement `ThemeToggle.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { applyTheme, nextTheme, readTheme, type Theme } from '@/lib/theme';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dusk');
  useEffect(() => setTheme(readTheme()), []);
  return (
    <button
      type="button"
      aria-label={theme === 'dusk' ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => { const t = nextTheme(theme); setTheme(t); applyTheme(t); }}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border transition"
      style={{ borderColor: 'var(--y-line)', color: 'var(--y-muted)' }}
    >
      {theme === 'dusk' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/theme.ts tests/theme.test.ts src/components/ThemeToggle.tsx
git commit -m "feat(redesign): theme toggle (dusk/daylight) with persistence"
```

---

### Task 3: Shared editor-chrome components

**Files:**
- Create: `src/components/marketing/GutterSpine.tsx`
- Create: `src/components/marketing/StatusBar.tsx`

**Interfaces:**
- Produces: `GutterSpine({ lines }: { lines: number })` — renders a right-bordered mono column of line numbers `1..lines`, colored `var(--y-gnum)`. `StatusBar({ items, right }: { items: string[]; right: string[] })` — renders a `var(--y-brand)` bar with mono text `var(--y-statfg)`; first `items[0]` gets a leading dot. Both consumed by Tasks 4 and 6.

- [ ] **Step 1: Implement `GutterSpine.tsx`**

```tsx
export default function GutterSpine({ lines }: { lines: number }) {
  return (
    <div
      aria-hidden
      className="select-none border-r text-right font-[family-name:var(--font-mono-code)] text-xs leading-[2.2]"
      style={{ borderColor: 'var(--y-line)', color: 'var(--y-gnum)', padding: '44px 14px' }}
    >
      {Array.from({ length: lines }, (_, i) => <div key={i}>{i + 1}</div>)}
    </div>
  );
}
```

- [ ] **Step 2: Implement `StatusBar.tsx`**

```tsx
export default function StatusBar({ items, right }: { items: string[]; right: string[] }) {
  return (
    <div
      className="flex h-[34px] items-center gap-6 px-[18px] font-[family-name:var(--font-mono-code)] text-xs font-semibold"
      style={{ background: 'var(--y-brand)', color: 'var(--y-statfg)' }}
    >
      {items.map((t, i) => (
        <span key={t} className="flex items-center">
          {i === 0 && <span className="mr-1.5 inline-block h-[7px] w-[7px] rounded-full" style={{ background: 'var(--y-statfg)' }} />}
          {t}
        </span>
      ))}
      <span className="ml-auto flex gap-6">{right.map((t) => <span key={t}>{t}</span>)}</span>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors from the two new files.

- [ ] **Step 4: Commit**

```bash
git add src/components/marketing/GutterSpine.tsx src/components/marketing/StatusBar.tsx
git commit -m "feat(redesign): shared GutterSpine + StatusBar editor-chrome components"
```

---

### Task 4: Rebuild the landing homepage

**Files:**
- Modify: `src/app/(marketing)/page.tsx` (replace the `LandingHome` function and its module-level copy constants; keep the `Home` default export's auth branching and `SignedInHomeShell` usage intact)

**Interfaces:**
- Consumes: `GutterSpine`, `StatusBar` (Task 3); `--y-*` tokens and fonts (Task 1).
- Produces: nothing consumed downstream.

- [ ] **Step 1: Delete the filler constants**

Remove `heroHighlights`, `heroPoints`, `workflowSteps`, `featureColumns`, `fadeUp`, and the `HeroPoint`/`WorkflowStep`/`FeatureColumn` types. Keep the `'use client'` directive, the `useSession` import, and the `Home` default export exactly as-is.

- [ ] **Step 2: Implement the new `LandingHome`**

```tsx
import GutterSpine from '@/components/marketing/GutterSpine';
import StatusBar from '@/components/marketing/StatusBar';

function LandingHome() {
  return (
    <div className="mx-auto w-full max-w-[1080px]" style={{ color: 'var(--y-fg)' }}>
      <div
        className="overflow-hidden rounded-[14px] border shadow-[0_30px_90px_rgba(0,0,0,.4)]"
        style={{ background: 'var(--y-ink)', borderColor: 'var(--y-line)' }}
      >
        {/* tab strip */}
        <div className="flex font-[family-name:var(--font-mono-code)] text-[12.5px]" style={{ background: 'var(--y-panel2)', borderBottom: '1px solid var(--y-line)' }}>
          <div className="flex items-center gap-2 border-r px-[18px] py-[9px]" style={{ borderColor: 'var(--y-line)', borderTop: '2px solid var(--y-brand)', color: 'var(--y-fg)' }}>
            <span className="h-[7px] w-[7px] rounded-full" style={{ background: 'var(--y-brand)' }} />welcome.py
          </div>
          <div className="border-r px-[18px] py-[11px]" style={{ borderColor: 'var(--y-line)', color: 'var(--y-muted)' }}>readme.md</div>
        </div>

        {/* hero: gutter + stage */}
        <div className="grid grid-cols-[56px_1fr]">
          <GutterSpine lines={17} />
          <div className="px-[52px] py-[52px]">
            <h1 className="font-[family-name:var(--font-display)] text-[clamp(34px,6vw,60px)] font-extrabold leading-[1.0] tracking-[-0.035em]" style={{ maxWidth: '16ch' }}>
              Your dev environment is{' '}
              <span className="rounded-[3px] px-1.5 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]" style={{ background: 'var(--y-sel-hl)' }}>now a URL</span>
              <span className="y-caret ml-0.5 inline-block h-[0.9em] w-[3px] align-[-0.12em]" style={{ background: 'var(--y-brand)', animation: 'yblink 1.05s steps(1) infinite' }} />.
            </h1>
            <p className="mt-6 text-[17px]" style={{ color: 'var(--y-muted)' }}>write it, run it, share it — all in the tab</p>
            <div className="mt-8 flex gap-[11px] font-[family-name:var(--font-mono-code)] text-[13px]">
              <a href="/ide" className="rounded-[9px] px-[22px] py-3 font-semibold" style={{ background: 'var(--y-brand)', color: 'var(--y-statfg)' }}>Open the IDE</a>
              <a href="/features" className="rounded-[9px] border px-[22px] py-3" style={{ borderColor: 'var(--y-line)', color: 'var(--y-fg)' }}>Browse an example</a>
            </div>

            {/* live code block */}
            <div className="mt-10 overflow-hidden rounded-[11px] border" style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)' }}>
              <div className="flex justify-between border-b px-[15px] py-[10px] font-[family-name:var(--font-mono-code)] text-[11.5px]" style={{ borderColor: 'var(--y-line)', color: 'var(--y-muted)' }}>
                <span>welcome.py</span><span style={{ color: 'var(--y-brand)' }}>▶ run</span>
              </div>
              <pre className="overflow-x-auto whitespace-pre px-5 py-[18px] font-[family-name:var(--font-mono-code)] text-[13px] leading-[1.9]" style={{ color: 'var(--y-fg)' }}>
<span style={{ color: 'var(--y-muted)', fontStyle: 'italic' }}># hit run — output appears below, no backend</span>{'\n'}
<span style={{ color: 'var(--y-kw)' }}>def</span> <span style={{ color: 'var(--y-fn)' }}>primes</span>(limit):{'\n'}    sieve = [<span style={{ color: 'var(--y-kw)' }}>True</span>] * limit{'\n'}    <span style={{ color: 'var(--y-kw)' }}>for</span> n <span style={{ color: 'var(--y-op)' }}>in</span> <span style={{ color: 'var(--y-fn)' }}>range</span>(<span style={{ color: 'var(--y-num)' }}>2</span>, <span style={{ color: 'var(--y-fn)' }}>int</span>(limit**<span style={{ color: 'var(--y-num)' }}>0.5</span>)+<span style={{ color: 'var(--y-num)' }}>1</span>):{'\n'}        <span style={{ color: 'var(--y-kw)' }}>if</span> sieve[n]: sieve[n*n::n] = [<span style={{ color: 'var(--y-kw)' }}>False</span>] * <span style={{ color: 'var(--y-fn)' }}>len</span>(sieve[n*n::n]){'\n'}    <span style={{ color: 'var(--y-kw)' }}>return</span> [i <span style={{ color: 'var(--y-kw)' }}>for</span> i <span style={{ color: 'var(--y-op)' }}>in</span> <span style={{ color: 'var(--y-fn)' }}>range</span>(<span style={{ color: 'var(--y-num)' }}>2</span>, limit) <span style={{ color: 'var(--y-kw)' }}>if</span> sieve[i]]{'\n\n'}<span style={{ color: 'var(--y-fn)' }}>print</span>(<span style={{ color: 'var(--y-fn)' }}>primes</span>(<span style={{ color: 'var(--y-num)' }}>30</span>))</pre>
              <div className="border-t px-5 py-[13px] font-[family-name:var(--font-mono-code)] text-[12.5px]" style={{ borderColor: 'var(--y-line)', background: 'var(--y-console-bg)', color: 'var(--y-str)' }}>
                <span style={{ color: 'var(--y-muted)' }}>→ </span>[2, 3, 5, 7, 11, 13, 17, 19, 23, 29]  <span style={{ color: 'var(--y-muted)' }}># 0.04s · pyodide/wasm</span>
              </div>
            </div>
          </div>
        </div>

        <StatusBar
          items={['welcome.py', 'Python 3.12', 'Ln 15, Col 22']}
          right={['runs in-browser', 'UTF-8', '⧉ share']}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add the caret keyframes to `globals.css`**

Append (once):

```css
@keyframes yblink { 50% { opacity: 0; } }
```

- [ ] **Step 4: Run the app and verify the homepage (signed out)**

Run: `npm run dev`, open `http://localhost:3000`. Verify: editor-chrome hero renders, headline shows the highlighted "now a URL" with a blinking caret, tagline present, live-code block with output, marigold status bar footer. Toggle the theme (once Task 5 wires the button; until then set `document.documentElement.dataset.theme='daylight'` in devtools) and confirm both themes read cleanly. Take screenshots of both themes.

- [ ] **Step 5: Run existing tests**

Run: `npm test`
Expected: all PASS (no logic touched).

- [ ] **Step 6: Commit**

```bash
git add "src/app/(marketing)/page.tsx" src/app/globals.css
git commit -m "feat(redesign): rebuild landing homepage as an editor session"
```

---

### Task 5: Restyle marketing nav + shell

**Files:**
- Modify: `src/app/(marketing)/MarketingNav.tsx`
- Modify: `src/app/(marketing)/layout.tsx`

**Interfaces:**
- Consumes: `ThemeToggle` (Task 2); `--y-*` tokens.

- [ ] **Step 1: Update `MarketingNav.tsx`**

Keep the component's structure, `useScrollDirection`, mobile menu, and auth logic. Change: (a) import and render `ThemeToggle` in the right-side control cluster (before "Open IDE"); (b) replace the wordmark — swap the `<span className="h-2 w-2 rounded-full bg-white" />` + uppercase tracking for a mono wordmark:

```tsx
<Link href="/" className="flex items-center gap-2 font-[family-name:var(--font-mono-code)] text-[15px] font-bold tracking-[-0.02em]" style={{ color: 'var(--y-fg)' }}>
  <span className="h-[15px] w-[15px] rounded-[4px]" style={{ background: 'var(--y-brand)' }} />
  yentic
</Link>
```

(c) Replace the scrolled/nav background classes to use `var(--y-ink)` / `var(--y-line)` instead of `--color-*`; (d) change the "Open IDE" pill from `bg-white text-black` to `style={{ background:'var(--y-brand)', color:'var(--y-statfg)' }}`. Add `import ThemeToggle from '@/components/ThemeToggle';`.

- [ ] **Step 2: Update `layout.tsx`**

(a) Change the outer wrapper background from `bg-[var(--color-bg-primary)] text-white` to `style={{ background:'var(--y-ink)', color:'var(--y-fg)' }}`. (b) DELETE the radial-glow div (`<div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(...)]" />`). (c) Restyle the footer to `--y-*` tokens (borders `var(--y-line)`, muted text `var(--y-muted)`). (d) Human-voice the footer tagline: replace "Fast browser editing without the noise." with "A real IDE that runs in your browser.".

- [ ] **Step 3: Verify nav + toggle end-to-end**

Run: `npm run dev`, open `/`. Click the new theme toggle: the whole page (hero + nav + footer) must switch Dusk↔Daylight and persist across reload. Confirm the dark→light `#dce5f0` section flip is gone. Screenshot nav in both themes; check keyboard focus is visible on the toggle and links.

- [ ] **Step 4: Run tests**

Run: `npm test && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(marketing)/MarketingNav.tsx" "src/app/(marketing)/layout.tsx"
git commit -m "feat(redesign): restyle marketing nav/shell, add theme toggle, drop glow"
```

---

### Task 6: Rebuild the projects page as a workspace explorer

**Files:**
- Modify: `src/components/home/SignedInHomeShell.tsx` (replace only the returned JSX + classNames; keep every hook, state variable, handler, and the `Modal`/`Dropdown`/`Input` usage)

**Interfaces:**
- Consumes: `--y-*` tokens; existing `filterProjectsByQuery`, `getMenuActionsForScope`, `workspaceConfigs`, `resolveWorkspaceSlugFromLanguage`, and all current handlers (`handleCreate`, `handleRename`, `handleDeleteOwnedProject`, `handleShareOwnedProject`, `handleActionSelect`, `loadProjects`).

- [ ] **Step 1: Preserve logic, replace layout**

Do NOT change any code above the `return (`. Replace the returned JSX with an explorer layout: a left sidebar (`Workspaces`: Owned/Shared scope switch bound to `setActiveScope`; `Runtimes` list is display-only) and a main pane (title "All projects" / "Shared with me", the existing search `Input` bound to `query`/`setQuery`, and the project list as **rows** not cards). Use this row markup inside the existing `filteredProjects.map(...)` (keep the `resolvedSlug`/`workspace`/`ownerLabel` computation and the `Dropdown` menu wiring exactly as they are):

```tsx
<div
  key={project.id}
  className="grid cursor-pointer grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b py-3.5"
  style={{ borderColor: 'var(--y-line)' }}
>
  <button type="button" onClick={() => openProject(project.id)} className="text-left font-[family-name:var(--font-mono-code)] text-sm" style={{ color: 'var(--y-fg)' }}>
    {project.name}<span style={{ color: 'var(--y-muted)' }}>/{workspace?.entry ?? 'main'}</span>
  </button>
  <span className="rounded-[5px] px-2 py-0.5 font-[family-name:var(--font-mono-code)] text-[11px]" style={{ background: 'var(--y-sel-tint)', color: 'var(--y-brand)' }}>
    {workspace?.title ?? project.language}
  </span>
  {ownerLabel ? <span className="font-[family-name:var(--font-mono-code)] text-[11.5px]" style={{ color: 'var(--y-muted)' }}>{ownerLabel}</span> : <span />}
  <span className="font-[family-name:var(--font-mono-code)] text-[11.5px]" style={{ color: 'var(--y-muted)' }}>{formatUpdatedAt(project.updatedAt)}</span>
  {/* keep the existing MoreVertical button + <Dropdown> block here, unchanged */}
</div>
```

Restyle the sidebar scope buttons, the empty/loading/error states, the `Create` button, and both `Modal`s to `--y-*` tokens (backgrounds `var(--y-panel)`, borders `var(--y-line)`, primary buttons `var(--y-brand)`/`var(--y-statfg)`). Keep every `onClick`, `disabled`, and conditional exactly as-is. If `workspace.entry` does not exist on the config type, use a literal filename map instead: `{web:'index.html',python:'main.py',c:'main.c',cpp:'main.cpp',java:'App.java'}[resolvedSlug] ?? 'main'`.

- [ ] **Step 2: Verify behavior is unchanged**

Run: `npm run dev`, sign in (or use a seeded session). Confirm: project list loads, search filters, Owned/Shared toggle switches scope and counts, Create modal creates + navigates, Rename modal renames, the row `⋯` menu opens with the same actions per scope, Share copies a link, Delete confirms + removes. Screenshot the explorer in Dusk and Daylight.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: `projects-home.test.ts` and all others PASS (pure functions untouched).

- [ ] **Step 4: Commit**

```bash
git add src/components/home/SignedInHomeShell.tsx
git commit -m "feat(redesign): rebuild projects page as a workspace explorer"
```

---

### Task 7: Copy + metadata cleanup on touched surfaces

**Files:**
- Modify: `src/app/(marketing)/signup/page.tsx` (line ~20), `src/app/(marketing)/features/page.tsx` (line ~15)
- Modify: `README.md`

**Interfaces:** none.

- [ ] **Step 1: Human-voice the flagged strings**

In `signup/page.tsx` replace "Collaboration features are coming soon." with a concrete line, e.g. "Sign in with Google to save projects and share them." In `features/page.tsx` remove or replace "Prettier presets (coming soon)." with a shipped-only statement. Scan both files for em-dash-drama / negation-list / "in seconds" patterns and fix any found (keep changes minimal and truthful).

- [ ] **Step 2: Fix stale README**

In `README.md` replace the WebRTC claims ("Yjs and WebRTC", "Yjs + `y-webrtc`", "uses Yjs with WebRTC signaling") with the current stack: "Collaborative editing powered by Yjs over Liveblocks." Update the Tech Stack line accordingly.

- [ ] **Step 3: Verify + commit**

Run: `npm run lint`
Expected: PASS.

```bash
git add "src/app/(marketing)/signup/page.tsx" "src/app/(marketing)/features/page.tsx" README.md
git commit -m "docs(redesign): human-voice touched copy + fix stale README stack"
```

---

### Task 8: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Unit + e2e suites green**

Run: `npm test`
Expected: all `node:test` suites PASS.
Run: `npm run test:e2e`
Expected: `ide-picker.spec.ts` + `local-workspace.spec.ts` PASS — proving the out-of-scope `/ide` picker and IDE workspace are unbroken by the token/font changes.

- [ ] **Step 2: Cross-surface visual + a11y check**

With `npm run dev`: for each of the homepage and the signed-in projects page, in BOTH Dusk and Daylight — verify (a) responsive down to a 375px viewport (no horizontal scroll, nav collapses to the mobile menu), (b) keyboard focus is visible on all interactive elements, (c) with OS "reduce motion" on, the caret blink and theme transition are disabled. Capture before/after screenshots of the homepage and projects page for the PR.

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(redesign): responsive + a11y polish across redesigned surfaces"
```

---

## Self-Review

**Spec coverage:**
- Tokens/fonts → Task 1. ✓
- Theme toggle (default Dusk, Daylight alternate) → Tasks 1 (init) + 2 (toggle) + 5 (nav button). ✓
- Editor-identity signatures (gutter spine, status bar, live-code hero, selected-text headline moment, projects-as-explorer) → Tasks 3, 4, 6. ✓
- Homepage rebuild + copy cut → Task 4. ✓
- Marketing shell (remove dark→light flip, restyle nav) → Task 5. ✓
- Projects page rebuild with behavior preserved → Task 6. ✓
- Human-voice copy on touched surfaces + metadata → Tasks 4 (metadata), 7. ✓
- Out-of-scope items (IDE chrome, Liveblocks room-id bug, sub-page rebuilds, dead-code removal) → intentionally excluded; verified unbroken in Task 8. ✓
- Quality floor (responsive, focus, reduced-motion) → Tasks 1 (reduced-motion CSS) + 8. ✓

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to". The `workspace.entry` uncertainty in Task 6 is resolved with an explicit fallback map. ✓

**Type consistency:** `Theme`, `nextTheme`, `applyTheme`, `readTheme` names match across Tasks 2 and 5. `GutterSpine({lines})` and `StatusBar({items,right})` signatures match their use in Tasks 4 and 6. ✓
