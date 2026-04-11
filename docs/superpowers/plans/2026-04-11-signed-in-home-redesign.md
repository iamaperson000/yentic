# Signed-In Home Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/dashboard` with a merged authenticated `/` app shell that is projects-first, real-data-driven, and includes create/rename/share/delete workflows.

**Architecture:** Keep route/auth split server-side on `/`, move signed-in UI into focused client components, and use existing projects API (`owned`/`shared`) with targeted endpoint additions for rename/delete so the home screen does not depend on IDE internals. Build a minimal sidebar shell and a projects workspace with tab/search/action state managed client-side.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, existing UI primitives (`Modal`, `Dropdown`, `Button`), Node test runner (`tsx --test`).

---

## File Structure

### Create
- `src/lib/projects-home.ts` — pure helpers for filtering and per-project action availability.
- `src/components/home/SignedInHomeShell.tsx` — signed-in app shell, sidebar/drawer, projects tabs/search/list/actions.
- `tests/projects-home.test.ts` — test coverage for filtering/action derivation behavior.

### Modify
- `src/app/(marketing)/page.tsx` — render signed-in shell for authenticated users; keep marketing for anonymous users.
- `src/app/api/projects/[id]/route.ts` — add `PATCH` (rename) and `DELETE` (owned project delete) handlers.
- `src/components/CommandPalette.tsx` — remove `/dashboard` references and point profile action to `/`.
- `src/app/dashboard/page.tsx` — remove route file (404 by absence).

## Task 1: Add test coverage for signed-in home helper behavior (RED)

**Files:**
- Create: `tests/projects-home.test.ts`

- [ ] **Step 1: Write failing tests for search filtering and action sets**
- [ ] **Step 2: Run `npm test -- tests/projects-home.test.ts` and verify failure because helper module is missing**

## Task 2: Implement helper module (GREEN)

**Files:**
- Create: `src/lib/projects-home.ts`
- Test: `tests/projects-home.test.ts`

- [ ] **Step 1: Implement helper functions used by signed-in UI**
- [ ] **Step 2: Run `npm test -- tests/projects-home.test.ts` and verify pass**

## Task 3: Build merged authenticated home shell

**Files:**
- Create: `src/components/home/SignedInHomeShell.tsx`
- Modify: `src/app/(marketing)/page.tsx`

- [ ] **Step 1: Add signed-in shell with minimal sidebar (`Create`, `Projects`) and mobile drawer**
- [ ] **Step 2: Add projects workspace with `Owned`/`Shared` tabs and search-only filtering**
- [ ] **Step 3: Add card click-to-open and `⋮` menu action handling**
- [ ] **Step 4: Add create and rename modals using real API calls**

## Task 4: Extend projects API for home-screen actions

**Files:**
- Modify: `src/app/api/projects/[id]/route.ts`

- [ ] **Step 1: Add `PATCH` rename endpoint with auth/access checks and duplicate-name conflict handling**
- [ ] **Step 2: Add `DELETE` endpoint for owners to remove projects**

## Task 5: Remove dashboard path and stale command palette links

**Files:**
- Modify: `src/components/CommandPalette.tsx`
- Delete: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Remove Dashboard command and update Profile target away from `/dashboard`**
- [ ] **Step 2: Delete dashboard route file so `/dashboard` 404s**

## Task 6: Verify and regressions check

**Files:**
- Verify: changed files above

- [ ] **Step 1: Run targeted tests `npm test -- tests/projects-home.test.ts`**
- [ ] **Step 2: Run full unit suite `npm test`**
- [ ] **Step 3: Run lint on touched files or full `npm run lint`**
- [ ] **Step 4: Manual smoke: signed-in `/`, unauthenticated `/`, and `/dashboard` 404**
