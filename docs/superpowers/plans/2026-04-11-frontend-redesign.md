# Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full visual and interaction overhaul of Yentic IDE — design tokens, component library, animations, command palette, and workspace chrome — inspired by Linear, Vercel, and Raycast.

**Architecture:** Three-layer approach: (1) design foundation with tokens, typography, and reusable components, (2) marketing and app chrome with animations and command palette, (3) IDE workspace with improved header, file explorer, resizable panels, and status bar. Each layer builds on the previous one.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4 (inline theme), Framer Motion, cmdk, lucide-react.

**Spec:** `docs/superpowers/specs/2026-04-11-frontend-redesign-design.md`

---

## File Structure

### New Files

```
src/components/ui/Button.tsx          — Primary/secondary button with hover glow
src/components/ui/Card.tsx            — Container with optional hover lift + glow
src/components/ui/SectionHeader.tsx   — Badge dot + label + heading + description
src/components/ui/Input.tsx           — Form input with focus ring and error state
src/components/ui/Modal.tsx           — Backdrop blur overlay with enter/exit animation
src/components/ui/Dropdown.tsx        — Keyboard-navigable dropdown menu
src/components/ui/Badge.tsx           — Uppercase tracking label
src/components/ui/Tooltip.tsx         — Hover tooltip with delay
src/components/CommandPalette.tsx     — cmdk-powered global command palette
src/components/StatusBar.tsx          — Bottom bar with language, cursor pos, connection
src/components/ResizablePanel.tsx     — Drag-to-resize split pane
src/hooks/useScrollDirection.ts       — Detect scroll up/down for nav hide/show
src/hooks/useKeyboardShortcuts.ts     — Global keyboard shortcut handler
```

### Modified Files

```
src/app/globals.css                       — Design tokens as CSS custom properties
src/app/layout.tsx                        — next/font Geist setup
src/app/(marketing)/layout.tsx            — New sticky nav, footer cleanup
src/app/(marketing)/MarketingNav.tsx      — Backdrop blur, hide/show on scroll, Cmd+K trigger
src/app/(marketing)/page.tsx              — Hero glow, scroll animations
src/app/(marketing)/features/page.tsx     — Scroll animations, Lucide icons
src/app/(marketing)/roadmap/page.tsx      — Scroll animations
src/app/(marketing)/signup/page.tsx       — Form improvements, Google button
src/app/dashboard/page.tsx                — Quick-launch row, icons
src/app/ide/page.tsx                      — Card hover upgrades, empty states
src/components/AuthStatus.tsx             — Use Dropdown component
src/components/FileExplorer.tsx           — Icons, animations, context menu, resize
src/components/WorkspaceClient.tsx        — Breadcrumb header, tabs, keyboard shortcuts, status bar
src/components/PresenceAvatars.tsx        — Smoother animations, tooltips
```

---

## Phase 1: Design Foundation

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install framer-motion, cmdk, and lucide-react**

```bash
cd /Users/kanishkv/Developer/yentic-main
npm install framer-motion cmdk lucide-react
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('framer-motion'); require('cmdk'); require('lucide-react'); console.log('All deps OK')"
```

Expected: `All deps OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add framer-motion, cmdk, and lucide-react dependencies"
```

---

### Task 2: Design Tokens in globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace the existing theme block in globals.css with design tokens**

The current file uses `@theme inline` with minimal variables. Replace the entire content of `src/app/globals.css` with:

```css
@import "tailwindcss";

/* ── Design tokens ── */
:root {
  /* Dark palette (default) */
  --color-bg-primary: #08090a;
  --color-bg-elevated: #0b0e13;
  --color-bg-surface: #131923;
  --color-bg-overlay: #171d27;

  --color-border-subtle: rgba(255, 255, 255, 0.1);
  --color-border-medium: #2f3a4a;
  --color-border-strong: #445162;

  --color-text-primary: #edf3fb;
  --color-text-secondary: #b8c5d6;
  --color-text-muted: #8ea0b6;
  --color-text-faint: #9fb0c4;

  --color-accent: #10b981;
  --color-accent-hover: #34d399;

  /* Light section palette (marketing cards) */
  --color-light-bg: #dce5f0;
  --color-light-bg-hover: #d3dde9;
  --color-light-text: #131923;
  --color-light-text-secondary: #273446;
  --color-light-text-heading: #0f1621;
  --color-light-text-body: rgba(39, 52, 70, 0.85);
  --color-light-border: #b5c0ce;
  --color-light-muted: #445162;

  /* Language tints */
  --color-tint-web: #6ee7b7;
  --color-tint-python: #67e8f9;
  --color-tint-c: #fdba74;
  --color-tint-cpp: #fcd34d;
  --color-tint-java: #7dd3fc;

  /* Fonts */
  --font-sans: var(--font-geist-sans), "Inter", "SF Pro Display", "Segoe UI", sans-serif;
  --font-mono: var(--font-geist-mono), "SF Mono", "Fira Code", monospace;
}

@theme inline {
  --color-bg-primary: var(--color-bg-primary);
  --color-bg-elevated: var(--color-bg-elevated);
  --color-bg-surface: var(--color-bg-surface);
  --color-bg-overlay: var(--color-bg-overlay);

  --color-border-subtle: var(--color-border-subtle);
  --color-border-medium: var(--color-border-medium);
  --color-border-strong: var(--color-border-strong);

  --color-text-primary: var(--color-text-primary);
  --color-text-secondary: var(--color-text-secondary);
  --color-text-muted: var(--color-text-muted);
  --color-text-faint: var(--color-text-faint);

  --color-accent: var(--color-accent);
  --color-accent-hover: var(--color-accent-hover);

  --color-light-bg: var(--color-light-bg);
  --color-light-bg-hover: var(--color-light-bg-hover);
  --color-light-text: var(--color-light-text);
  --color-light-text-secondary: var(--color-light-text-secondary);
  --color-light-border: var(--color-light-border);
  --color-light-muted: var(--color-light-muted);

  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
}

/* ── Typography scale ── */
.text-display {
  font-size: clamp(3.5rem, 5vw, 4.375rem);
  line-height: 1.02;
  letter-spacing: -0.04em;
  font-weight: 600;
}

.text-title {
  font-size: clamp(2.5rem, 4vw, 3rem);
  line-height: 1.05;
  letter-spacing: -0.04em;
  font-weight: 500;
}

.text-heading {
  font-size: clamp(1.375rem, 2vw, 1.875rem);
  line-height: 1.2;
  letter-spacing: -0.02em;
  font-weight: 500;
}

.text-body {
  font-size: 0.9375rem;
  line-height: 1.55;
  font-weight: 400;
}

.text-caption {
  font-size: 0.6875rem;
  line-height: 1.4;
  letter-spacing: 0.14em;
  font-weight: 600;
  text-transform: uppercase;
}

/* ── Base ── */
body {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
}

::selection {
  background-color: rgba(16, 185, 129, 0.4);
  color: var(--color-bg-surface);
}

/* ── Scrollbar ── */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.35) transparent;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.35);
  border-radius: 3px;
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* ── Sandpack overrides ── */
.sp-wrapper,
.sp-layout,
.sp-stack {
  height: 100% !important;
  width: 100% !important;
}

.sp-preview-container,
.sp-preview-iframe {
  height: 100% !important;
  width: 100% !important;
  flex: 1;
}

.sp-layout {
  border: none !important;
  border-radius: 0 !important;
  background: transparent !important;
}

.sp-wrapper {
  display: flex;
  flex-direction: column;
}

.sp-stack {
  display: flex;
  flex-direction: column;
}

.sp-preview-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sp-preview-actions {
  display: none !important;
}

.sp-preview-iframe {
  border: none !important;
}

div[class*="sp-"] {
  padding: 0 !important;
  margin: 0 !important;
}

.sp-layout > * {
  flex: 1;
}
```

- [ ] **Step 2: Verify the app still builds**

```bash
cd /Users/kanishkv/Developer/yentic-main && npx next build 2>&1 | tail -5
```

Expected: Build completes without CSS errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add design tokens and typography scale to globals.css"
```

---

### Task 3: Set Up Geist Font via next/font

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Read the current layout.tsx**

Read `src/app/layout.tsx` to see the current font setup.

- [ ] **Step 2: Update layout.tsx to use next/font for Geist**

Install the Geist font package if not already present:

```bash
cd /Users/kanishkv/Developer/yentic-main && npm install geist
```

Then update `src/app/layout.tsx` to import and apply the Geist font:

```tsx
import './globals.css';

import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import type { Metadata } from 'next';

import SessionWrapper from '@/components/SessionWrapper';

export const metadata: Metadata = {
  title: 'Yentic — Classic Web IDE',
  description: 'A lightweight and fast web IDE that feels instantly familiar.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen antialiased font-sans">
        <SessionWrapper>{children}</SessionWrapper>
      </body>
    </html>
  );
}
```

This sets the CSS variables `--font-geist-sans` and `--font-geist-mono` that globals.css references.

- [ ] **Step 3: Verify the build**

```bash
cd /Users/kanishkv/Developer/yentic-main && npx next build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx package.json package-lock.json
git commit -m "feat: set up Geist font via next/font"
```

---

### Task 4: Button Component

**Files:**
- Create: `src/components/ui/Button.tsx`
- Test: `tests/components/ui/Button.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/ui/Button.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders with primary variant by default', () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole('button', { name: 'Click me' });
    expect(btn).toBeDefined();
    expect(btn.className).toContain('bg-white');
  });

  it('renders secondary variant', () => {
    render(<Button variant="secondary">Cancel</Button>);
    const btn = screen.getByRole('button', { name: 'Cancel' });
    expect(btn.className).toContain('border');
    expect(btn.className).not.toContain('bg-white');
  });

  it('renders as a link when href is provided', () => {
    render(<Button href="/ide">Go to IDE</Button>);
    const link = screen.getByRole('link', { name: 'Go to IDE' });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/ide');
  });

  it('applies size classes', () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole('button', { name: 'Small' });
    expect(btn.className).toContain('px-4');
  });
});
```

Note: If the project doesn't have vitest + testing-library set up yet, install them first:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

And create a minimal `vitest.config.ts` at the project root:

```ts
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/ui/Button.test.tsx 2>&1
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the Button component**

Create `src/components/ui/Button.tsx`:

```tsx
import Link from 'next/link';
import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary';
type ButtonSize = 'sm' | 'md';

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  className?: string;
}

interface ButtonAsButton extends ButtonBaseProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> {
  href?: never;
}

interface ButtonAsLink extends ButtonBaseProps {
  href: string;
}

type ButtonProps = ButtonAsButton | ButtonAsLink;

const base =
  'inline-flex items-center justify-center rounded-full font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-white text-black hover:bg-slate-200 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]',
  secondary:
    'border border-white/20 text-white/90 hover:border-white/40 hover:shadow-[0_0_16px_rgba(16,185,129,0.15)]',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-5 py-2.5 text-sm',
};

export function Button({ variant = 'primary', size = 'md', children, className = '', href, ...rest }: ButtonProps) {
  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/components/ui/Button.test.tsx 2>&1
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Button.tsx tests/components/ui/Button.test.tsx vitest.config.ts
git commit -m "feat: add Button component with primary/secondary variants"
```

---

### Task 5: Badge Component

**Files:**
- Create: `src/components/ui/Badge.tsx`

- [ ] **Step 1: Create the Badge component**

Create `src/components/ui/Badge.tsx`:

```tsx
import { type ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'subtle' | 'outline';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

const variantClasses = {
  subtle: 'bg-white/5 border-white/15 text-white/70',
  outline: 'border-border-strong text-text-faint',
};

const sizeClasses = {
  sm: 'px-2.5 py-0.5 text-[10px] tracking-[0.2em]',
  md: 'px-3 py-1 text-[11px] tracking-[0.2em]',
};

export function Badge({ children, variant = 'subtle', size = 'md', dot = false, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-medium uppercase ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {dot && <span className="h-2 w-2 rounded-full bg-current opacity-60" />}
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/Badge.tsx
git commit -m "feat: add Badge component"
```

---

### Task 6: SectionHeader Component

**Files:**
- Create: `src/components/ui/SectionHeader.tsx`

- [ ] **Step 1: Create the SectionHeader component**

This extracts the repeated pattern of badge-dot + uppercase label + heading + description found across all marketing pages.

Create `src/components/ui/SectionHeader.tsx`:

```tsx
import { type ReactNode } from 'react';

interface SectionHeaderProps {
  label: string;
  heading: string;
  description?: ReactNode;
  variant?: 'dark' | 'light';
  className?: string;
}

export function SectionHeader({ label, heading, description, variant = 'dark', className = '' }: SectionHeaderProps) {
  const isDark = variant === 'dark';

  return (
    <div className={`max-w-[760px] ${className}`}>
      <p
        className={`inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] ${
          isDark ? 'text-text-faint' : 'text-light-muted'
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${isDark ? 'bg-text-muted' : 'bg-light-muted'}`} />
        {label}
      </p>
      <h2
        className={`mt-4 text-title ${isDark ? 'text-text-primary' : 'text-light-text-heading'}`}
      >
        {heading}
      </h2>
      {description && (
        <p className={`mt-4 max-w-[68ch] text-body ${isDark ? 'text-text-secondary' : 'text-light-text-body'}`}>
          {description}
        </p>
      )}
    </div>
  );
}
```

Note: `text-light-text-heading` and `text-light-text-body` reference the CSS variables added as `--color-light-text-heading` and `--color-light-text-body` in globals.css. These need to also be registered in the `@theme inline` block. Update globals.css to add them if they weren't included.

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/SectionHeader.tsx
git commit -m "feat: add SectionHeader component"
```

---

### Task 7: Input Component

**Files:**
- Create: `src/components/ui/Input.tsx`

- [ ] **Step 1: Create the Input component**

Create `src/components/ui/Input.tsx`:

```tsx
import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

const inputBase =
  'w-full rounded-lg border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed';

const borderDefault = 'border-border-medium';
const borderError = 'border-red-500/60 focus:ring-red-500/40 focus:border-red-500/60';

export const Input = forwardRef<HTMLInputElement, InputProps>(({ error, className = '', ...props }, ref) => {
  return (
    <div className="space-y-1">
      <input ref={ref} className={`${inputBase} ${error ? borderError : borderDefault} ${className}`} {...props} />
      {error && (
        <p className="text-xs text-red-400 animate-in slide-in-from-top-1 fade-in duration-200">{error}</p>
      )}
    </div>
  );
});
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ error, className = '', ...props }, ref) => {
  return (
    <div className="space-y-1">
      <textarea ref={ref} className={`${inputBase} ${error ? borderError : borderDefault} ${className}`} {...props} />
      {error && (
        <p className="text-xs text-red-400 animate-in slide-in-from-top-1 fade-in duration-200">{error}</p>
      )}
    </div>
  );
});
Textarea.displayName = 'Textarea';
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/Input.tsx
git commit -m "feat: add Input and Textarea components"
```

---

### Task 8: Tooltip Component

**Files:**
- Create: `src/components/ui/Tooltip.tsx`

- [ ] **Step 1: Create the Tooltip component**

Create `src/components/ui/Tooltip.tsx`:

```tsx
'use client';

import { type ReactNode, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: 'top' | 'bottom';
  delay?: number;
}

export function Tooltip({ content, children, side = 'top', delay = 300 }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  function handleEnter() {
    timeoutRef.current = setTimeout(() => setOpen(true), delay);
  }

  function handleLeave() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(false);
  }

  return (
    <div className="relative inline-flex" onMouseEnter={handleEnter} onMouseLeave={handleLeave} onFocus={handleEnter} onBlur={handleLeave}>
      {children}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: side === 'top' ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            role="tooltip"
            className={`absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-bg-surface px-2.5 py-1 text-xs text-text-secondary shadow-lg border border-border-subtle pointer-events-none ${
              side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/Tooltip.tsx
git commit -m "feat: add Tooltip component with framer-motion animation"
```

---

### Task 9: Modal Component

**Files:**
- Create: `src/components/ui/Modal.tsx`
- Test: `tests/components/ui/Modal.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/ui/Modal.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Modal } from '@/components/ui/Modal';

describe('Modal', () => {
  it('renders children when open', () => {
    render(
      <Modal open onClose={() => {}}>
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.getByText('Modal content')).toBeDefined();
  });

  it('does not render when closed', () => {
    render(
      <Modal open={false} onClose={() => {}}>
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.queryByText('Modal content')).toBeNull();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <p>Content</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/ui/Modal.test.tsx 2>&1
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the Modal component**

Create `src/components/ui/Modal.tsx`:

```tsx
'use client';

import { type ReactNode, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, children, className = '' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`relative z-10 rounded-xl border border-border-medium bg-bg-overlay shadow-2xl ${className}`}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/components/ui/Modal.test.tsx 2>&1
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Modal.tsx tests/components/ui/Modal.test.tsx
git commit -m "feat: add Modal component with backdrop blur and animations"
```

---

### Task 10: Dropdown Component

**Files:**
- Create: `src/components/ui/Dropdown.tsx`
- Test: `tests/components/ui/Dropdown.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/ui/Dropdown.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';

describe('Dropdown', () => {
  it('shows items when open', () => {
    render(
      <Dropdown open onClose={() => {}}>
        <DropdownItem onSelect={() => {}}>Edit</DropdownItem>
        <DropdownItem onSelect={() => {}}>Delete</DropdownItem>
      </Dropdown>
    );
    expect(screen.getByText('Edit')).toBeDefined();
    expect(screen.getByText('Delete')).toBeDefined();
  });

  it('hides items when closed', () => {
    render(
      <Dropdown open={false} onClose={() => {}}>
        <DropdownItem onSelect={() => {}}>Edit</DropdownItem>
      </Dropdown>
    );
    expect(screen.queryByText('Edit')).toBeNull();
  });

  it('calls onSelect when an item is clicked', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <Dropdown open onClose={onClose}>
        <DropdownItem onSelect={onSelect}>Edit</DropdownItem>
      </Dropdown>
    );
    fireEvent.click(screen.getByText('Edit'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('navigates items with arrow keys', () => {
    render(
      <Dropdown open onClose={() => {}}>
        <DropdownItem onSelect={() => {}}>First</DropdownItem>
        <DropdownItem onSelect={() => {}}>Second</DropdownItem>
      </Dropdown>
    );
    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toBe('First');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toBe('Second');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/ui/Dropdown.test.tsx 2>&1
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the Dropdown component**

Create `src/components/ui/Dropdown.tsx`:

```tsx
'use client';

import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface DropdownProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

interface DropdownItemProps {
  onSelect: () => void;
  children: ReactNode;
  destructive?: boolean;
  className?: string;
}

export function Dropdown({ open, onClose, children, align = 'right', className = '' }: DropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
      if (!items?.length) return;

      const currentIndex = Array.from(items).indexOf(document.activeElement as HTMLElement);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[next].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prev].focus();
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={menuRef}
          role="menu"
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ duration: 0.12 }}
          onKeyDown={handleKeyDown}
          className={`absolute z-50 mt-2 min-w-[180px] overflow-hidden rounded-lg border border-border-medium bg-bg-surface shadow-xl shadow-black/30 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${className}`}
        >
          <div className="py-1">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function DropdownItem({ onSelect, children, destructive = false, className = '' }: DropdownItemProps) {
  function handleClick() {
    onSelect();
    // onClose is called by the parent Dropdown via bubbling or direct reference
  }

  return (
    <button
      role="menuitem"
      tabIndex={-1}
      onClick={handleClick}
      className={`flex w-full items-center px-3 py-2 text-sm transition-colors focus:outline-none focus:bg-white/5 hover:bg-white/5 ${
        destructive ? 'text-red-400 hover:text-red-300' : 'text-text-secondary hover:text-text-primary'
      } ${className}`}
    >
      {children}
    </button>
  );
}
```

Note: The `onClose` call on item click needs to be handled. Update `DropdownItem` to accept the parent's `onClose`. The cleanest way is to use React context, but for simplicity let's update the Dropdown to clone children and pass onClose:

Actually, simpler: wrap the Dropdown so each DropdownItem click triggers `onClose` from the parent. Update `Dropdown` to use context:

```tsx
// Add at the top of the file, after imports:
import { createContext, useContext } from 'react';

const DropdownContext = createContext<{ onClose: () => void }>({ onClose: () => {} });

// In Dropdown component, wrap children:
// Replace: <div className="py-1">{children}</div>
// With:
<DropdownContext.Provider value={{ onClose }}>
  <div className="py-1">{children}</div>
</DropdownContext.Provider>

// In DropdownItem, use context:
export function DropdownItem({ onSelect, children, destructive = false, className = '' }: DropdownItemProps) {
  const { onClose } = useContext(DropdownContext);

  function handleClick() {
    onSelect();
    onClose();
  }
  // ... rest unchanged
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/components/ui/Dropdown.test.tsx 2>&1
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Dropdown.tsx tests/components/ui/Dropdown.test.tsx
git commit -m "feat: add Dropdown component with keyboard navigation"
```

---

### Task 11: Card Component

**Files:**
- Create: `src/components/ui/Card.tsx`

- [ ] **Step 1: Create the Card component**

Create `src/components/ui/Card.tsx`:

```tsx
import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  variant?: 'dark' | 'light';
  hoverable?: boolean;
  glow?: boolean;
  className?: string;
  as?: 'div' | 'article' | 'section';
}

const baseClasses = 'relative overflow-hidden rounded-xl border transition-all duration-200';

const variantClasses = {
  dark: 'border-border-medium bg-bg-elevated',
  light: 'border-light-border bg-light-bg',
};

const hoverDark = 'hover:-translate-y-1 hover:border-border-strong';
const hoverLight = 'hover:-translate-y-0.5 hover:bg-light-bg-hover';

const glowDark = 'hover:shadow-[0_0_24px_rgba(16,185,129,0.12)]';
const glowLight = 'hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]';

export function Card({ children, variant = 'dark', hoverable = false, glow = false, className = '', as: Tag = 'div' }: CardProps) {
  const isDark = variant === 'dark';
  const classes = [
    baseClasses,
    variantClasses[variant],
    hoverable ? (isDark ? hoverDark : hoverLight) : '',
    glow ? (isDark ? glowDark : glowLight) : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <Tag className={classes}>{children}</Tag>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/Card.tsx
git commit -m "feat: add Card component with hover and glow variants"
```

---

## Phase 2: Marketing & App Chrome

### Task 12: useScrollDirection Hook

**Files:**
- Create: `src/hooks/useScrollDirection.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useScrollDirection.ts`:

```ts
'use client';

import { useMotionValueEvent, useScroll } from 'framer-motion';
import { useState } from 'react';

export function useScrollDirection() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setHidden(latest > previous && latest > 80);
    setScrolled(latest > 20);
  });

  return { hidden, scrolled };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useScrollDirection.ts
git commit -m "feat: add useScrollDirection hook for nav hide/show"
```

---

### Task 13: Redesign MarketingNav

**Files:**
- Modify: `src/app/(marketing)/MarketingNav.tsx`

- [ ] **Step 1: Read the current MarketingNav**

Read `src/app/(marketing)/MarketingNav.tsx` to see the full current implementation.

- [ ] **Step 2: Rewrite MarketingNav with backdrop blur and scroll behavior**

Replace the contents of `src/app/(marketing)/MarketingNav.tsx` with:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Command } from 'lucide-react';

import { site } from '@/config/site';
import { useScrollDirection } from '@/hooks/useScrollDirection';

export interface NavLink {
  href: string;
  label: string;
}

export default function MarketingNav({ links }: { links: NavLink[] }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { hidden, scrolled } = useScrollDirection();

  return (
    <motion.nav
      animate={{ y: hidden ? -100 : 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className={`sticky top-0 z-50 h-[64px] backdrop-blur-xl transition-colors duration-300 ${
        scrolled
          ? 'border-b border-border-subtle bg-bg-primary/80'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-full max-w-[1436px] items-center justify-between px-6 sm:px-8">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold tracking-[0.14em] text-text-primary">
          <span className="h-2 w-2 rounded-full bg-white" />
          {site.name}
        </Link>

        {/* Center: Nav links */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'text-text-primary'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <button
            className="hidden items-center gap-2 rounded-lg border border-border-subtle px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:border-border-medium hover:text-text-secondary sm:inline-flex"
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          >
            <Command className="h-3 w-3" />
            <span>K</span>
          </button>

          {!session && (
            <Link
              href="/signup"
              className="rounded-full border border-white/20 px-4 py-1.5 text-sm font-semibold text-white/90 transition hover:border-white/40"
            >
              Sign up
            </Link>
          )}

          <Link
            href="/ide"
            className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black transition hover:bg-slate-200"
          >
            Open IDE
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
```

- [ ] **Step 3: Update the marketing layout to remove the old sticky header wrapper**

Read `src/app/(marketing)/layout.tsx` and update the header section. The nav is now self-contained with its own sticky positioning, so the layout's `<header>` wrapper should be simplified — just render `<MarketingNav links={navLinks} />` without the old sticky/backdrop styles since the nav handles that internally.

- [ ] **Step 4: Verify the build**

```bash
cd /Users/kanishkv/Developer/yentic-main && npx next build 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/app/'(marketing)'/MarketingNav.tsx src/app/'(marketing)'/layout.tsx
git commit -m "feat: redesign MarketingNav with backdrop blur and scroll hide/show"
```

---

### Task 14: Command Palette

**Files:**
- Create: `src/components/CommandPalette.tsx`
- Modify: `src/app/layout.tsx` (add CommandPalette to root layout)

- [ ] **Step 1: Write the failing test**

Create `tests/components/CommandPalette.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null }),
}));

import { CommandPalette } from '@/components/CommandPalette';

describe('CommandPalette', () => {
  it('opens on Cmd+K', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByPlaceholderText(/search/i)).toBeDefined();
  });

  it('shows navigation items', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByText('Open IDE')).toBeDefined();
    expect(screen.getByText('Features')).toBeDefined();
  });

  it('shows workspace items', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByText('Web')).toBeDefined();
    expect(screen.getByText('Python')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/CommandPalette.test.tsx 2>&1
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the CommandPalette component**

Create `src/components/CommandPalette.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Code2,
  FileCode,
  Globe,
  Layout,
  Map,
  Terminal,
  UserCircle,
} from 'lucide-react';

const navigationItems = [
  { label: 'Open IDE', href: '/ide', icon: Code2 },
  { label: 'Dashboard', href: '/dashboard', icon: Layout },
  { label: 'Features', href: '/features', icon: FileCode },
  { label: 'Roadmap', href: '/roadmap', icon: Map },
  { label: 'Profile', href: '/dashboard', icon: UserCircle },
];

const workspaceItems = [
  { label: 'Web', href: '/ide/web', icon: Globe },
  { label: 'Python', href: '/ide/python', icon: Terminal },
  { label: 'C', href: '/ide/c', icon: Terminal },
  { label: 'C++', href: '/ide/cpp', icon: Terminal },
  { label: 'Java', href: '/ide/java', icon: Terminal },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15 }}
            className="relative z-10 w-full max-w-[520px] overflow-hidden rounded-xl border border-border-medium bg-bg-overlay shadow-2xl"
          >
            <Command className="flex flex-col" label="Command palette">
              <Command.Input
                placeholder="Search pages, workspaces..."
                className="w-full border-b border-border-medium bg-transparent px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none"
              />
              <Command.List className="custom-scrollbar max-h-[320px] overflow-y-auto p-2">
                <Command.Empty className="px-4 py-8 text-center text-sm text-text-muted">
                  No results found.
                </Command.Empty>

                <Command.Group heading="Navigation" className="mb-2">
                  <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">Navigation</p>
                  {navigationItems.map((item) => (
                    <Command.Item
                      key={item.href}
                      value={item.label}
                      onSelect={() => navigate(item.href)}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-text-secondary transition-colors data-[selected=true]:bg-white/5 data-[selected=true]:text-text-primary"
                    >
                      <item.icon className="h-4 w-4 text-text-muted" />
                      {item.label}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Workspaces" className="mb-2">
                  <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">Workspaces</p>
                  {workspaceItems.map((item) => (
                    <Command.Item
                      key={item.href}
                      value={`${item.label} workspace`}
                      onSelect={() => navigate(item.href)}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-text-secondary transition-colors data-[selected=true]:bg-white/5 data-[selected=true]:text-text-primary"
                    >
                      <item.icon className="h-4 w-4 text-text-muted" />
                      {item.label}
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Add CommandPalette to root layout**

In `src/app/layout.tsx`, import and render `<CommandPalette />` inside the `<body>` after `<SessionWrapper>`:

```tsx
import { CommandPalette } from '@/components/CommandPalette';

// In the return, inside <body>:
<body className="min-h-screen antialiased font-sans">
  <SessionWrapper>
    <CommandPalette />
    {children}
  </SessionWrapper>
</body>
```

Note: `CommandPalette` must be inside `SessionWrapper` if it needs session data later.

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run tests/components/CommandPalette.test.tsx 2>&1
```

Expected: All 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/CommandPalette.tsx tests/components/CommandPalette.test.tsx src/app/layout.tsx
git commit -m "feat: add command palette with Cmd+K navigation"
```

---

### Task 15: Scroll Animation Wrapper

**Files:**
- Create: `src/components/ui/AnimateIn.tsx`

- [ ] **Step 1: Create the AnimateIn component**

This is a reusable wrapper for scroll-triggered fade-up animations, used across all marketing pages.

Create `src/components/ui/AnimateIn.tsx`:

```tsx
'use client';

import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface AnimateInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function AnimateIn({ children, delay = 0, className = '' }: AnimateInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerChildren({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        visible: { transition: { staggerChildren: 0.06 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/AnimateIn.tsx
git commit -m "feat: add AnimateIn scroll animation components"
```

---

### Task 16: Homepage Hero Glow and Animations

**Files:**
- Modify: `src/app/(marketing)/page.tsx`

- [ ] **Step 1: Read the current homepage**

Read `src/app/(marketing)/page.tsx` to see the full current implementation.

- [ ] **Step 2: Update the LandingHome component**

Convert to a client component (add `'use client'` at top if not already present). Wrap the hero section elements with staggered entrance animations using `motion.div`. Add a radial gradient glow behind the heading.

Key changes to the hero section inside `LandingHome`:
- Add `'use client'` directive (already present in the file)
- Import `motion` from `framer-motion` and `AnimateIn` from `@/components/ui/AnimateIn`
- Add a radial glow `div` behind the h1: `<div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full bg-accent/15 blur-[120px]" />`
- Wrap the badge, h1, p, and CTA div each in `<motion.div>` with staggered `initial={{ opacity: 0, y: 16 }}` and `animate={{ opacity: 1, y: 0 }}` with increasing `transition.delay` (0, 0.1, 0.2, 0.3)
- Wrap the workflow and product sections in `<AnimateIn>`
- Replace hardcoded hex colors with token classes where possible (e.g., `bg-[#07090d]` → `bg-bg-elevated`, `text-[#edf3fb]` → `text-text-primary`, `border-white/10` → `border-border-subtle`)

Do NOT rewrite the entire file — make targeted edits to the existing JSX. The data arrays at the top stay unchanged.

- [ ] **Step 3: Verify the build**

```bash
cd /Users/kanishkv/Developer/yentic-main && npx next build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/app/'(marketing)'/page.tsx
git commit -m "feat: add hero glow effect and scroll animations to homepage"
```

---

### Task 17: Add Scroll Animations to Features, Roadmap, and Signup Pages

**Files:**
- Modify: `src/app/(marketing)/features/page.tsx`
- Modify: `src/app/(marketing)/roadmap/page.tsx`
- Modify: `src/app/(marketing)/signup/page.tsx`

- [ ] **Step 1: Read all three files**

Read the current state of all three marketing pages.

- [ ] **Step 2: Convert to client components and add animations**

For each of the three files:

1. Add `'use client';` directive at the top (if not already present)
2. Import `{ AnimateIn }` from `@/components/ui/AnimateIn`
3. Wrap each `<section>` in `<AnimateIn>` with increasing delays (0, 0.1, 0.2)
4. Replace hardcoded hex colors with design token classes where straightforward (same mappings as Task 16)
5. Add Lucide icons to the features page card headers:
   - Import `{ Code2, Eye, Users }` from `lucide-react`
   - Add the icon before each feature group title in the features page

Do NOT rewrite the files — make targeted wrapping edits.

- [ ] **Step 3: Verify the build**

```bash
cd /Users/kanishkv/Developer/yentic-main && npx next build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/app/'(marketing)'/features/page.tsx src/app/'(marketing)'/roadmap/page.tsx src/app/'(marketing)'/signup/page.tsx
git commit -m "feat: add scroll animations and icons to marketing pages"
```

---

### Task 18: Upgrade Dashboard Page

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Read the current dashboard**

Read `src/app/dashboard/page.tsx`.

- [ ] **Step 2: Add quick-launch row and Lucide icons**

Add a quick-launch workspace row between the hero and the action cards. Import Lucide icons for the action cards.

Key changes:
- Import `{ Code2, UserCircle, Globe, Terminal }` from `lucide-react`
- Add a quick-launch section after the hero: a horizontal row of small workspace buttons (one per language). Each is a `<Link>` to `/ide/{slug}` with a small icon and the language name.
- Add icons to the two existing action cards: `<Code2>` for the IDE card, `<UserCircle>` for the profile card
- Replace hardcoded colors with token classes

- [ ] **Step 3: Verify the build**

```bash
cd /Users/kanishkv/Developer/yentic-main && npx next build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: add quick-launch row and icons to dashboard"
```

---

### Task 19: Upgrade IDE Picker Page

**Files:**
- Modify: `src/app/ide/page.tsx`

- [ ] **Step 1: Read the current IDE picker**

Read `src/app/ide/page.tsx`.

- [ ] **Step 2: Upgrade workspace cards and empty states**

Key changes:
- Make language-tinted gradients persistent at low opacity (not just on hover). Change the gradient div from `opacity-0 group-hover:opacity-100` to `opacity-30 group-hover:opacity-60`
- Add hover glow: `hover:shadow-[0_0_24px_var(--color-tint-{lang})/0.15]` — since we can't use dynamic CSS vars in Tailwind directly, apply this per-card using inline styles or a tint-specific class
- Upgrade empty state messages: replace plain text with a Lucide icon (`FolderOpen`) + clearer CTA
- Replace the footer badge "Yentic IDE" with just the wordmark, remove the outer border styling
- Replace hardcoded colors with token classes

- [ ] **Step 3: Verify the build**

```bash
cd /Users/kanishkv/Developer/yentic-main && npx next build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/app/ide/page.tsx
git commit -m "feat: upgrade IDE picker cards with persistent tints and glow"
```

---

### Task 20: Upgrade AuthStatus to Use Dropdown Component

**Files:**
- Modify: `src/components/AuthStatus.tsx`

- [ ] **Step 1: Read the current AuthStatus**

Read `src/components/AuthStatus.tsx`.

- [ ] **Step 2: Replace manual dropdown with Dropdown component**

Replace the manual `open` state + ref-based click detection + custom dropdown JSX with the `Dropdown` and `DropdownItem` components from `src/components/ui/Dropdown.tsx`.

Key changes:
- Remove the `menuRef` and manual click-outside handler
- Import `{ Dropdown, DropdownItem }` from `@/components/ui/Dropdown`
- Replace the dropdown `<div>` with `<Dropdown open={open} onClose={() => setOpen(false)}>` containing `<DropdownItem>` for each menu item
- Keep the trigger button unchanged (the avatar/name button)
- Replace hardcoded colors with token classes

- [ ] **Step 3: Verify the build**

```bash
cd /Users/kanishkv/Developer/yentic-main && npx next build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/components/AuthStatus.tsx
git commit -m "refactor: use Dropdown component in AuthStatus"
```

---

## Phase 3: IDE Workspace

### Task 21: Keyboard Shortcuts Hook

**Files:**
- Create: `src/hooks/useKeyboardShortcuts.ts`
- Test: `tests/hooks/useKeyboardShortcuts.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/hooks/useKeyboardShortcuts.test.ts`:

```tsx
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  it('calls handler when shortcut is pressed', () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'b', meta: true, handler }])
    );

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', metaKey: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not call handler for non-matching key', () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'b', meta: true, handler }])
    );

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', metaKey: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('supports shift modifier', () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'p', meta: true, shift: true, handler }])
    );

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', metaKey: true, shiftKey: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/hooks/useKeyboardShortcuts.test.ts 2>&1
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the hook**

Create `src/hooks/useKeyboardShortcuts.ts`:

```ts
'use client';

import { useEffect } from 'react';

interface Shortcut {
  key: string;
  meta?: boolean;
  shift?: boolean;
  ctrl?: boolean;
  handler: () => void;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.meta ? e.metaKey || e.ctrlKey : true;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : true;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (keyMatch && metaMatch && shiftMatch && ctrlMatch) {
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/hooks/useKeyboardShortcuts.test.ts 2>&1
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useKeyboardShortcuts.ts tests/hooks/useKeyboardShortcuts.test.ts
git commit -m "feat: add useKeyboardShortcuts hook"
```

---

### Task 22: StatusBar Component

**Files:**
- Create: `src/components/StatusBar.tsx`

- [ ] **Step 1: Create the StatusBar component**

Create `src/components/StatusBar.tsx`:

```tsx
'use client';

interface StatusBarProps {
  language: string;
  cursorLine?: number;
  cursorColumn?: number;
  connected?: boolean;
}

const languageLabels: Record<string, string> = {
  html: 'HTML',
  css: 'CSS',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  c: 'C',
  cpp: 'C++',
  java: 'Java',
};

export function StatusBar({ language, cursorLine, cursorColumn, connected }: StatusBarProps) {
  const displayLang = languageLabels[language] ?? language;

  return (
    <div className="flex h-6 items-center justify-between border-t border-border-subtle bg-bg-surface px-3 text-[11px] text-text-muted">
      {/* Left */}
      <div className="flex items-center gap-4">
        <span>{displayLang}</span>
        <span>UTF-8</span>
      </div>

      {/* Center */}
      <div>
        {cursorLine != null && cursorColumn != null && (
          <span>Ln {cursorLine}, Col {cursorColumn}</span>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {connected != null && (
          <span className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        )}
        <span className="hidden text-text-faint sm:inline">Cmd+K</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/StatusBar.tsx
git commit -m "feat: add StatusBar component for IDE workspace"
```

---

### Task 23: ResizablePanel Component

**Files:**
- Create: `src/components/ResizablePanel.tsx`
- Test: `tests/components/ResizablePanel.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/ResizablePanel.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ResizablePanel } from '@/components/ResizablePanel';

describe('ResizablePanel', () => {
  it('renders left and right panels', () => {
    render(
      <ResizablePanel
        left={<div data-testid="left">Left</div>}
        right={<div data-testid="right">Right</div>}
      />
    );
    expect(screen.getByTestId('left')).toBeDefined();
    expect(screen.getByTestId('right')).toBeDefined();
  });

  it('renders the drag handle', () => {
    render(
      <ResizablePanel
        left={<div>Left</div>}
        right={<div>Right</div>}
      />
    );
    expect(screen.getByRole('separator')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/ResizablePanel.test.tsx 2>&1
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the ResizablePanel component**

Create `src/components/ResizablePanel.tsx`:

```tsx
'use client';

import { type ReactNode, useCallback, useRef, useState } from 'react';

interface ResizablePanelProps {
  left: ReactNode;
  right: ReactNode;
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  minRightWidth?: number;
}

export function ResizablePanel({
  left,
  right,
  defaultLeftWidth = 250,
  minLeftWidth = 160,
  maxLeftWidth = 400,
  minRightWidth = 200,
}: ResizablePanelProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    setDragging(true);

    function handleMouseMove(e: MouseEvent) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const containerWidth = rect.width;
      const newLeft = e.clientX - rect.left;

      const clamped = Math.min(
        Math.max(newLeft, minLeftWidth),
        Math.min(maxLeftWidth, containerWidth - minRightWidth)
      );
      setLeftWidth(clamped);
    }

    function handleMouseUp() {
      setDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [minLeftWidth, maxLeftWidth, minRightWidth]);

  return (
    <div ref={containerRef} className="relative flex h-full w-full" style={{ cursor: dragging ? 'col-resize' : undefined }}>
      <div className="flex-shrink-0 overflow-hidden" style={{ width: leftWidth }}>
        {left}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={handleMouseDown}
        className={`group relative z-10 flex w-1 flex-shrink-0 cursor-col-resize items-center justify-center transition-colors hover:bg-accent/20 ${
          dragging ? 'bg-accent/30' : 'bg-border-subtle'
        }`}
      >
        <div className="absolute flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="h-0.5 w-0.5 rounded-full bg-text-muted" />
          <span className="h-0.5 w-0.5 rounded-full bg-text-muted" />
          <span className="h-0.5 w-0.5 rounded-full bg-text-muted" />
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-hidden">
        {right}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/components/ResizablePanel.test.tsx 2>&1
```

Expected: All 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ResizablePanel.tsx tests/components/ResizablePanel.test.tsx
git commit -m "feat: add ResizablePanel component with drag handle"
```

---

### Task 24: Upgrade FileExplorer with Icons and Animations

**Files:**
- Modify: `src/components/FileExplorer.tsx`

- [ ] **Step 1: Read the current FileExplorer**

Read `src/components/FileExplorer.tsx`.

- [ ] **Step 2: Add Lucide icons and Framer Motion animations**

Key changes:
- Import `{ File, FileCode, FileText, Folder, FolderOpen, Search, Plus, Pencil, Trash2 }` from `lucide-react`
- Import `{ AnimatePresence, motion }` from `framer-motion`
- Add a file icon helper function that returns the appropriate Lucide icon based on file extension:
  ```tsx
  function fileIcon(path: string) {
    if (path.endsWith('.js') || path.endsWith('.ts') || path.endsWith('.jsx') || path.endsWith('.tsx')) return <FileCode className="h-3.5 w-3.5 text-amber-300/70" />;
    if (path.endsWith('.py')) return <FileCode className="h-3.5 w-3.5 text-cyan-300/70" />;
    if (path.endsWith('.html')) return <FileCode className="h-3.5 w-3.5 text-orange-300/70" />;
    if (path.endsWith('.css')) return <FileCode className="h-3.5 w-3.5 text-purple-300/70" />;
    if (path.endsWith('.c') || path.endsWith('.cpp') || path.endsWith('.java')) return <FileCode className="h-3.5 w-3.5 text-sky-300/70" />;
    return <File className="h-3.5 w-3.5 text-text-muted" />;
  }
  ```
- Add the icon before each filename in the file list
- Change active file styling: add a left accent border `border-l-2 border-accent` instead of just background change
- Wrap the file list in `<AnimatePresence>` and each file item in `<motion.div>` with `layout` prop and subtle enter/exit animations
- Replace Lucide icons for action buttons (use `<Pencil>` for rename, `<Trash2>` for delete, `<Plus>` for new file)
- Add a small search input at the top of the file list (filter files by name, local state)
- Replace hardcoded colors with token classes

- [ ] **Step 3: Verify the build**

```bash
cd /Users/kanishkv/Developer/yentic-main && npx next build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/components/FileExplorer.tsx
git commit -m "feat: upgrade FileExplorer with icons, animations, and search"
```

---

### Task 25: Redesign Workspace Header with Breadcrumbs and Tab Bar

**Files:**
- Modify: `src/components/WorkspaceClient.tsx`

- [ ] **Step 1: Read WorkspaceClient layout structure**

Read `src/components/WorkspaceClient.tsx`. This is a large file (~53KB). Focus on understanding the header section and how the file explorer, editor, and preview are arranged in the JSX return.

- [ ] **Step 2: Redesign the workspace header**

The current header is a basic bar with project name and buttons. Replace it with a compact 44px header with three zones:

**Left zone — Breadcrumb path:**
```tsx
<div className="flex items-center gap-1.5 text-sm">
  <Link href="/ide" className="text-text-muted hover:text-text-primary transition-colors">
    {workspaceTitle}
  </Link>
  <span className="text-text-muted">/</span>
  <span className="text-text-secondary">{projectName}</span>
  <span className="text-text-muted">/</span>
  <span className="text-text-primary">{activeFileName}</span>
</div>
```

**Center zone — Tab bar for open files:**
Add state for open tabs: `const [openTabs, setOpenTabs] = useState<string[]>([])`. When a file is selected, add it to openTabs if not already there. Render tabs as:
```tsx
<div className="flex items-center gap-0.5 overflow-x-auto">
  {openTabs.map(path => (
    <button
      key={path}
      onClick={() => selectFile(path)}
      className={`flex items-center gap-2 rounded-t-md px-3 py-1.5 text-xs transition-colors ${
        path === activePath
          ? 'border-b-2 border-accent text-text-primary'
          : 'text-text-muted hover:text-text-secondary'
      }`}
    >
      {fileName(path)}
      {unsavedFiles.has(path) ? (
        <span className="h-1.5 w-1.5 rounded-full bg-text-muted" />
      ) : (
        <span onClick={(e) => { e.stopPropagation(); closeTab(path); }} className="hover:text-text-primary">x</span>
      )}
    </button>
  ))}
</div>
```

**Right zone:** Keep existing share button + presence avatars. Add save status dot (green/yellow/gray) and a settings gear icon from Lucide.

- [ ] **Step 3: Add StatusBar to the bottom of the workspace**

Import and render `<StatusBar>` at the bottom of the workspace layout:

```tsx
import { StatusBar } from '@/components/StatusBar';
```

Add it as the last element in the workspace container, below the editor/preview area. Pass the current language, cursor position, and connection status.

To get cursor position from Monaco, add an `onDidChangeCursorPosition` listener in the Editor or WorkspaceClient where Monaco is configured. Store `cursorLine` and `cursorColumn` in state.

- [ ] **Step 4: Wrap file explorer and editor/preview in ResizablePanel**

Import and use `<ResizablePanel>` to replace the current fixed-width layout:

```tsx
import { ResizablePanel } from '@/components/ResizablePanel';
```

Replace the current flex layout with:

```tsx
<ResizablePanel
  left={<FileExplorer ... />}
  right={/* existing editor + preview area */}
  defaultLeftWidth={220}
  minLeftWidth={160}
  maxLeftWidth={400}
/>
```

- [ ] **Step 5: Add preview toolbar**

Add a compact toolbar at the top of the preview panel:

```tsx
<div className="flex h-8 items-center justify-between border-b border-border-subtle bg-bg-elevated px-3">
  <span className="text-caption text-text-muted">Preview</span>
  <div className="flex items-center gap-2">
    <button onClick={refreshPreview} className="text-text-muted hover:text-text-primary transition-colors">
      <RotateCw className="h-3.5 w-3.5" />
    </button>
    <button onClick={openPreviewInNewTab} className="text-text-muted hover:text-text-primary transition-colors">
      <ExternalLink className="h-3.5 w-3.5" />
    </button>
  </div>
</div>
```

Import `{ RotateCw, ExternalLink, Settings }` from `lucide-react`.

- [ ] **Step 6: Add keyboard shortcuts for toggling panels**

Import and use the keyboard shortcuts hook:

```tsx
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
```

Add state for panel visibility:
```tsx
const [showExplorer, setShowExplorer] = useState(true);
const [showPreview, setShowPreview] = useState(true);
```

Wire up shortcuts:
```tsx
useKeyboardShortcuts([
  { key: 'b', meta: true, handler: () => setShowExplorer(prev => !prev) },
  { key: '\\', meta: true, handler: () => setShowPreview(prev => !prev) },
  { key: 'w', meta: true, handler: () => closeActiveTab() },
  { key: '[', meta: true, shift: true, handler: () => switchToPrevTab() },
  { key: ']', meta: true, shift: true, handler: () => switchToNextTab() },
]);
```

Conditionally render the explorer and preview panels based on these states.

- [ ] **Step 7: Verify the build**

```bash
cd /Users/kanishkv/Developer/yentic-main && npx next build 2>&1 | tail -10
```

- [ ] **Step 8: Commit**

```bash
git add src/components/WorkspaceClient.tsx
git commit -m "feat: redesign workspace header, add tabs, status bar, resizable panels, and shortcuts"
```

---

### Task 26: Upgrade PresenceAvatars with Animations and Tooltips

**Files:**
- Modify: `src/components/PresenceAvatars.tsx`

- [ ] **Step 1: Read the current PresenceAvatars**

Read `src/components/PresenceAvatars.tsx`.

- [ ] **Step 2: Add Framer Motion layout animations and Tooltip**

Key changes:
- Import `{ AnimatePresence, motion }` from `framer-motion`
- Import `{ Tooltip }` from `@/components/ui/Tooltip`
- Wrap the avatar container in `<AnimatePresence>`
- Wrap each avatar in `<motion.div layout>` with `initial={{ opacity: 0, scale: 0.8 }}` and `animate={{ opacity: 1, scale: 1 }}`
- Wrap each avatar in `<Tooltip content={username}>` so hovering shows the username
- Replace hardcoded colors with token classes

- [ ] **Step 3: Verify the build**

```bash
cd /Users/kanishkv/Developer/yentic-main && npx next build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/components/PresenceAvatars.tsx
git commit -m "feat: add animations and tooltips to PresenceAvatars"
```

---

### Task 27: Migrate Remaining Hardcoded Colors to Tokens

**Files:**
- Modify: `src/app/(marketing)/layout.tsx`
- Modify: `src/app/(marketing)/privacy/page.tsx`
- Modify: `src/app/(marketing)/terms/page.tsx`
- Modify: `src/app/setup-profile/page.tsx`
- Modify: `src/app/u/[username]/page.tsx`
- Modify: `src/app/users/page.tsx`

- [ ] **Step 1: Read all files to identify remaining hardcoded colors**

Read each file listed above.

- [ ] **Step 2: Replace hardcoded hex colors with token classes**

Use these mappings consistently:

| Hardcoded | Token class |
|-----------|-------------|
| `bg-[#08090a]` | `bg-bg-primary` |
| `bg-[#07090d]` | `bg-bg-elevated` |
| `bg-[#0b0e13]` | `bg-bg-elevated` |
| `bg-[#131923]` | `bg-bg-surface` |
| `bg-[#171d27]` | `bg-bg-overlay` |
| `border-white/10` | `border-border-subtle` |
| `border-[#2f3a4a]` | `border-border-medium` |
| `border-[#445162]` | `border-border-strong` |
| `text-[#edf3fb]` | `text-text-primary` |
| `text-[#b8c5d6]` | `text-text-secondary` |
| `text-[#8ea0b6]` | `text-text-muted` |
| `text-[#9fb0c4]` | `text-text-faint` |
| `bg-[#dce5f0]` | `bg-light-bg` |
| `border-[#b5c0ce]` | `border-light-border` |
| `text-[#131923]` | `text-light-text` |
| `text-[#445162]` | `text-light-muted` |

Apply these replacements to every file listed. Some colors may not have exact token matches (e.g., `text-[#0f1621]`, `text-[#101a27]`, `text-[#273446]/85`) — for these, use the closest token or leave them if they're one-off values used only in that file.

- [ ] **Step 3: Verify the build**

```bash
cd /Users/kanishkv/Developer/yentic-main && npx next build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: migrate remaining hardcoded colors to design tokens"
```

---

### Task 28: Final Verification and Cleanup

**Files:**
- All modified files

- [ ] **Step 1: Run the full build**

```bash
cd /Users/kanishkv/Developer/yentic-main && npx next build 2>&1
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Run all tests**

```bash
npx vitest run 2>&1
```

Expected: All tests pass.

- [ ] **Step 3: Run existing Playwright e2e tests**

```bash
npx playwright test 2>&1
```

Expected: All existing e2e tests pass (no regression).

- [ ] **Step 4: Visual check — start the dev server**

```bash
cd /Users/kanishkv/Developer/yentic-main && npm run dev
```

Manually verify:
- Homepage loads with glow effect and scroll animations
- Nav hides on scroll down, shows on scroll up
- Cmd+K opens command palette on all pages
- Features/Roadmap/Signup pages have scroll animations
- IDE picker shows tinted workspace cards
- IDE workspace has resizable file explorer, status bar at bottom
- Cmd+B toggles file explorer, Cmd+\ toggles preview
- AuthStatus dropdown uses new Dropdown component

- [ ] **Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "fix: final cleanup and polish after frontend redesign"
```
