# Yentic Frontend Redesign

Full visual and interaction overhaul of the Yentic IDE, inspired by Linear, Vercel, Raycast, Railway, and Cursor.

**Scope:** Everything — marketing pages, app chrome, and the IDE workspace itself.

**Goal:** Go from functional-but-generic to polished and premium. Make it feel like a product people want to use, not just one that works.

---

## New Dependencies

| Package | Purpose | Size (gzipped) |
|---------|---------|----------------|
| `framer-motion` | Page transitions, scroll reveals, micro-interactions | ~40KB |
| `cmdk` | Command palette (Cmd+K) | ~5KB |
| `lucide-react` | Consistent icon set, tree-shakeable | ~0KB (per-icon imports) |

No full component library (shadcn, Radix, etc.). Keep custom components, just encapsulate them properly.

---

## Layer 1: Design Foundation

### Design Tokens

Replace all hardcoded hex values with CSS custom properties in `globals.css`, referenced through Tailwind's `@theme`.

**Dark palette:**

```
--color-bg-primary: #08090a        /* Page background */
--color-bg-elevated: #0b0e13       /* Cards, file explorer */
--color-bg-surface: #131923        /* Dropdowns, active states */
--color-bg-overlay: #171d27        /* Modals, overlays */
--color-border-subtle: rgba(255,255,255,0.1)
--color-border-medium: #2f3a4a
--color-border-strong: #445162
--color-text-primary: #edf3fb
--color-text-secondary: #b8c5d6
--color-text-muted: #8ea0b6
--color-text-faint: #9fb0c4
--color-accent: #10b981            /* Emerald green */
--color-accent-hover: #34d399
```

**Light section palette (for marketing cards):**

```
--color-light-bg: #dce5f0
--color-light-bg-hover: #d3dde9
--color-light-text: #131923
--color-light-text-secondary: #273446
--color-light-border: #b5c0ce
--color-light-muted: #445162
```

**Language tints (workspace accent colors):**

```
--color-tint-web: #6ee7b7            /* emerald-300 */
--color-tint-python: #67e8f9         /* cyan-300 */
--color-tint-c: #fdba74              /* orange-300 */
--color-tint-cpp: #fcd34d            /* amber-300 */
--color-tint-java: #7dd3fc           /* sky-300 */
```

### Typography Scale

Define in Tailwind config with fixed sizes, line-heights, and tracking:

| Token | Size | Line-height | Tracking | Usage |
|-------|------|-------------|----------|-------|
| `text-display` | 56-70px | 1.02 | -0.04em | Hero headings |
| `text-title` | 40-48px | 1.05 | -0.04em | Section headings |
| `text-heading` | 22-30px | 1.2 | -0.02em | Card headings |
| `text-body` | 14-15px | 1.55 | normal | Body text |
| `text-caption` | 11-12px | 1.4 | 0.12-0.2em | Labels, badges (uppercase) |

Font: Geist via `next/font` with fallback chain (Inter, SF Pro Display, Segoe UI, sans-serif).

### Component Library

Small internal set — extract the repeated patterns that exist across the codebase today.

**Button** — Two variants (primary, secondary), two sizes (sm, md). Primary: white bg, black text. Secondary: border + transparent bg. Both get hover glow (box-shadow with accent color at low opacity), focus ring, and transition.

**Card** — Base container with border, bg, rounded corners. Optional props: `hoverable` (adds lift + border brighten on hover), `glow` (adds accent glow on hover), `tint` (language color overlay).

**SectionHeader** — The repeated pattern of badge dot + uppercase label + heading + optional description. Props: `label`, `heading`, `description`, `variant` (dark/light).

**Input / Textarea** — Consistent styling with focus ring (accent color), error state (red border + message animation), disabled state.

**Modal** — Backdrop blur overlay, centered content, entrance animation (scale up + fade in from 95% to 100%), exit animation (fade out). Closes on Escape and backdrop click.

**Dropdown** — Keyboard navigable (arrow keys, Enter, Escape). Replaces the manual implementation in AuthStatus. Entrance animation (scale + fade from top). Focus trap.

**Badge** — The uppercase tracking label pattern used everywhere. Props: `variant` (subtle, outline), `size` (sm, md).

**Tooltip** — For icon-only buttons. Appears on hover after 300ms delay, positioned above by default. Simple fade-in.

---

## Layer 2: Marketing & App Chrome

### Navigation

Sticky header replacing the current simple nav:

- `position: sticky`, `backdrop-blur-xl`, semi-transparent `--color-bg-primary` at 80% opacity
- Hides on scroll down, reveals on scroll up (Framer Motion `useScroll` + `useMotionValueEvent`)
- Subtle bottom border (`--color-border-subtle`) fades in after scrolling past hero
- Contains: logo/wordmark left, nav links center, Cmd+K trigger + auth status right
- Command palette trigger opens `cmdk` overlay for quick navigation

### Command Palette (Cmd+K)

Powered by `cmdk`. Available globally across all pages.

Sections:
- **Navigation:** Go to IDE, Dashboard, Features, Roadmap, Profile
- **Workspaces:** Open Web, Python, C, C++, Java workspace
- **Recent projects:** List of last 5 saved projects (if authenticated)
- **Actions:** Sign in/out, toggle preview (when in IDE)

Styling: dark overlay, rounded container, search input at top, grouped results with keyboard navigation. Matches the dark palette tokens.

### Homepage Hero

Upgrade from flat dark box:

- Radial gradient glow behind the heading — soft emerald/blue bloom centered behind the h1, subtle (15-20% opacity)
- Staggered entrance animation: badge fades in first, then heading slides up, then subtitle, then CTAs (total ~600ms)
- Grid pattern gets a single gentle pulse on load, then settles to static
- CTA buttons: primary gets accent glow on hover (`box-shadow: 0 0 20px rgba(16,185,129,0.3)`)

### Scroll Animations

Applied to all marketing page sections:

- Each section fades up + translates 20px on enter (`whileInView` with `once: true`)
- Children within sections stagger by 50-80ms (cards, list items)
- Duration: 300-400ms entrance. No exit animation.
- `viewport: { amount: 0.2 }` — trigger when 20% visible
- Respect `prefers-reduced-motion`: disable all animations if set

### Marketing Cards (Light Sections)

Upgrade from flat:

- Subtle inner shadow for depth (`inset 0 1px 2px rgba(0,0,0,0.05)`)
- Hover: translate-y -2px, border brightens, faint accent glow
- Feature cards get a Lucide icon in the header area (e.g., Code2 for editing, Eye for preview, Users for collaboration)

### Dashboard

Upgrade from two plain link cards:

- Quick-launch row: horizontal strip of workspace buttons (small icon + label for each language), one click to open
- The two action cards (IDE, Profile) get Lucide icons and hover glow
- If the user has saved projects: show last 3 with timestamps below the action cards

### IDE Picker (`/ide`)

Upgrade workspace cards:

- Language-tinted gradient is persistent at low opacity (not just on hover)
- Hover: card lifts -4px, border glows with language tint, icon scales to 110%
- Saved projects: cards get a colored dot (green = updated within 24h, gray = older)
- Empty states: Lucide icon + clear CTA text + primary button

### Profile / Signup

- Google sign-in button: proper Google icon + "Continue with Google" label
- Form inputs use the `Input` component with accent focus rings
- Validation feedback slides in with a 200ms animation

---

## Layer 3: IDE Workspace

### Workspace Header

Redesigned compact header (~44px height):

**Left zone:** Breadcrumb path — `workspace / project-name / active-file.js`. Each segment is clickable (workspace goes to /ide, project-name opens project settings, file name is a dropdown of open files). Separated by `/` with muted color.

**Center zone:** Tab bar for open files. Each tab shows filename + close button (x). Active tab has a 2px bottom accent border (emerald). Unsaved files show a dot instead of the close button. Horizontal scroll with fade indicators on overflow edges.

**Right zone:** Share button (existing), presence avatars (existing, with improved animations), save status (dot — green for saved, yellow pulse for saving, gray for unsaved), settings gear icon.

Bottom border: `--color-border-subtle`. If the header content scrolls behind, slight backdrop blur.

### File Explorer

Upgrade from flat list:

**Icons:** Lucide icons for files and folders (Folder, FolderOpen, FileCode, FileText, File). File icons can be tinted by extension (`.js` = yellow, `.py` = blue, `.html` = orange, `.css` = purple).

**Animations:** Smooth expand/collapse on folders using Framer Motion `AnimatePresence` + height transition. Duration: 150-200ms.

**Active state:** Left accent border (2px emerald) on the active file row, replacing the current background-only highlight.

**Context menu:** Right-click on any file/folder opens a dropdown menu with: Rename, Delete, Duplicate, New File, New Folder. Uses the `Dropdown` component.

**Resizable width:** Drag handle on the right edge of the explorer panel. Min width: 160px, max: 400px, default: 220px. Handle shows grip dots on hover.

**Search:** Small search input at the top of the explorer to filter files by name.

### Editor Chrome

Monaco editor stays untouched. Improvements to the surrounding UI:

**Tabs:** Already described in header section. Tab overflow scrolls horizontally. Right-click on tab: Close, Close Others, Close All.

**Minimap toggle:** Small button in the top-right of the editor area to show/hide the Monaco minimap.

**First-visit hints:** On first workspace open, show a subtle overlay with 3-4 keyboard shortcut hints (Cmd+K, Cmd+S, Cmd+B). Dismisses on any keypress or click. Stored in localStorage so it only shows once.

### Preview Panel

**Resizable split:** Drag handle between editor and preview. Vertical grip dots that highlight on hover. Min width: 200px for each panel.

**Preview toolbar:** Compact bar at the top of the preview:
- Refresh button (re-renders preview)
- Open in new tab button (pops preview into separate window)
- For web workspaces: responsive size toggles (mobile 375px / tablet 768px / desktop full) — stretch goal

**Loading state:** Skeleton shimmer while preview compiles/loads.

**Console panel:** For runtime workspaces (Python, C, C++, Java), console output slides up from the bottom of the preview area. Toggle with a button in the preview toolbar. Scrollable, monospace font, clear button.

### Status Bar

New bottom bar across the full workspace width:

- Height: 24px
- Background: `--color-bg-surface`
- Top border: `--color-border-subtle`
- Left: language name (e.g., "JavaScript"), file encoding ("UTF-8")
- Center: cursor position ("Ln 42, Col 18")
- Right: collaboration status dot (green = connected, red = disconnected), "Cmd+K" hint text
- All text in `text-caption` size, `--color-text-muted`

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+K | Open command palette |
| Cmd+S | Save project |
| Cmd+B | Toggle file explorer sidebar |
| Cmd+\ | Toggle preview panel |
| Cmd+Shift+P | Open command palette (VS Code compat) |
| Cmd+W | Close active tab |
| Cmd+Shift+[ / ] | Switch to prev/next tab |

### Collaboration UI

- Presence avatars: smoother entrance/exit (Framer Motion layout animations), tooltip with username on hover
- Remote cursors: colored label with username, fades to just a colored line after 2s of inactivity
- "Follow mode" indicator when viewing another user's viewport — stretch goal

---

## Stretch Goals

Not in initial implementation scope, but designed to be added later:

1. Tab drag-to-reorder
2. File drag-to-reorder in explorer
3. Responsive preview size toggles (mobile/tablet/desktop)
4. Collaboration "follow mode"
5. Editor themes / theme picker

---

## Accessibility

All changes must maintain or improve accessibility:

- All interactive elements keyboard-navigable with visible focus rings
- `prefers-reduced-motion`: disable all Framer Motion animations
- Dropdown and modal components implement focus trapping
- Tooltips accessible via keyboard focus (not just hover)
- Color contrast maintained at WCAG AA minimum for all text tokens
- Command palette fully keyboard-driven (arrow keys, Enter, Escape)

---

## What We Are NOT Doing

- No light/dark mode toggle — commit to dark mode for a dev tool
- No redesign of Monaco editor internals — just the chrome around it
- No heavy component library (shadcn, Radix, MUI) — keep it custom
- No new pages or routes — only improving existing ones
- No backend changes — this is purely frontend
