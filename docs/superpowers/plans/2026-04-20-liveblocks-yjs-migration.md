# Liveblocks / Yjs Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the y-webrtc P2P collaboration transport with Liveblocks (via `@liveblocks/yjs`), preserving the existing Y.Doc, Y.Map file tree, MonacoBinding, awareness/presence, and Prisma `yjsState` persistence — while adding a secure auth endpoint that enforces project ownership/collaborator roles.

**Architecture:**
- Keep the existing Yjs stack end-to-end. Swap only the transport: `WebrtcProvider` → `LiveblocksYjsProvider` from `@liveblocks/yjs`. The Y.Doc, file-tree CRDT, MonacoBinding, and Prisma-backed snapshot persistence are unchanged.
- Security is enforced via a new `POST /api/liveblocks-auth` endpoint that validates the NextAuth session, parses the `project-<id>` room name, checks Prisma for owner/collaborator access, and issues a scoped Liveblocks ID-token session. Owners + editor collaborators get `FULL_ACCESS`; viewers get `READ_ACCESS`; anyone else gets 403.
- `CollaborativeEditor` is restructured: outer component mounts `<LiveblocksProvider authEndpoint=...>` + `<RoomProvider>`, inner component uses `useRoom()` to construct the `LiveblocksYjsProvider`. All existing refs, effects, and the `useCollaboration()` context API stay the same — `Editor.tsx` is untouched.

**Tech Stack:** Liveblocks (`@liveblocks/yjs`, `@liveblocks/node`, already-installed `@liveblocks/react`), Next.js 16 App Router, NextAuth v4, Prisma 6, Yjs 13, Monaco. Tests: `node:test` via `tsx` for unit tests, Playwright for e2e.

---

## File Structure

**Files to create:**
- `src/lib/liveblocks-server.ts` — server-side Liveblocks client singleton (wraps `@liveblocks/node`).
- `src/app/api/liveblocks-auth/route.ts` — POST route that authorizes a user for a specific `project-<id>` room.
- `src/lib/room-id.ts` — tiny helper: `parseProjectRoomId(room: string) → { projectId } | null` and inverse `projectRoomId(projectId)`. Shared by the client (room name) and the auth endpoint (room parsing).
- `tests/liveblocks-auth.test.ts` — unit tests for `resolveRoomAccess()` (pure function extracted from the route handler, mocks a Prisma-shaped project).
- `tests/room-id.test.ts` — unit tests for the room-id helpers.

**Files to modify:**
- `src/components/CollaborativeEditor.tsx` — restructure into outer (Liveblocks providers) + inner (existing Yjs logic with `LiveblocksYjsProvider` replacing `WebrtcProvider`).
- `src/lib/workspace-collaboration.ts` — delete `parseCollaborationSignalingServers` (no longer used).
- `tests/workspace-collaboration.test.ts` — remove the two `parseCollaborationSignalingServers` tests.
- `package.json` — add `@liveblocks/yjs` + `@liveblocks/node` (pinned to `^3.18.4`); remove `y-webrtc` and `y-websocket`.
- `.env.example` — add `LIVEBLOCKS_SECRET_KEY`; remove `NEXT_PUBLIC_COLLAB_SIGNALING` if it was documented there.
- `.env.local` — add `LIVEBLOCKS_SECRET_KEY` (value supplied by user).

**Files intentionally untouched:**
- `src/components/Editor.tsx` — consumes `useCollaboration()`, which keeps its contract.
- `src/app/[workspaceId]/page.tsx` and `WorkspaceClient.tsx` — the `CollaborativeEditor` component signature is unchanged.
- Prisma schema — `Project.yjsState` column stays as the authoritative DB-backed snapshot.
- `src/app/collab/*` — the demo page from earlier, unrelated.

---

## Task 1: Install dependencies and remove WebRTC libs

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install @liveblocks/yjs and @liveblocks/node**

Run:
```bash
npm install @liveblocks/yjs@^3.18.4 @liveblocks/node@^3.18.4
```

Expected: `package.json` `dependencies` now includes both at `^3.18.4`, `package-lock.json` updated, no errors.

- [ ] **Step 2: Remove y-webrtc and y-websocket**

Run:
```bash
npm uninstall y-webrtc y-websocket
```

Expected: `y-webrtc` and `y-websocket` removed from `package.json` dependencies. `yjs`, `y-monaco`, `y-protocols` remain. (`y-protocols` is pulled in transitively by `y-monaco` and `@liveblocks/yjs`.)

- [ ] **Step 3: Verify the installed versions**

Run:
```bash
node -e "const p = require('./package.json'); console.log({yjs: p.dependencies.yjs, yWebrtc: p.dependencies['y-webrtc'], yWebsocket: p.dependencies['y-websocket'], lbYjs: p.dependencies['@liveblocks/yjs'], lbNode: p.dependencies['@liveblocks/node']})"
```

Expected: `y-webrtc` and `y-websocket` are `undefined`. `@liveblocks/yjs` and `@liveblocks/node` are `^3.18.4`. `yjs` still present.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: swap y-webrtc/y-websocket for @liveblocks/yjs + @liveblocks/node"
```

---

## Task 2: Add env var plumbing

**Files:**
- Modify: `.env.example`
- Modify: `.env.local`

- [ ] **Step 1: Add LIVEBLOCKS_SECRET_KEY to .env.example and remove obsolete WebRTC var**

Edit `.env.example`. Find the section ending in:
```
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY="pk_dev_your-liveblocks-public-key"
```
Append immediately after it:
```

# Liveblocks server-side auth (required for the IDE collaborative editor)
LIVEBLOCKS_SECRET_KEY="sk_dev_your-liveblocks-secret-key"
```

Also remove any line mentioning `NEXT_PUBLIC_COLLAB_SIGNALING` if present.

- [ ] **Step 2: Add LIVEBLOCKS_SECRET_KEY to .env.local**

Append to `.env.local`:
```
LIVEBLOCKS_SECRET_KEY=sk_dev_REPLACE_ME
```

The user must replace `sk_dev_REPLACE_ME` with the real secret key from their Liveblocks dashboard (Project → API keys → Secret key) before running. Note this explicitly in the final commit message.

- [ ] **Step 3: Verify .env.local is gitignored**

Run:
```bash
git check-ignore -v .env.local
```

Expected: matches a `.env*` rule in `.gitignore`.

- [ ] **Step 4: Commit**

```bash
git add .env.example
git commit -m "env: add LIVEBLOCKS_SECRET_KEY, drop NEXT_PUBLIC_COLLAB_SIGNALING"
```

(`.env.local` must NOT be committed — it is gitignored.)

---

## Task 3: Room-id helper + tests (TDD)

**Files:**
- Create: `src/lib/room-id.ts`
- Test: `tests/room-id.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/room-id.test.ts`:
```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { parseProjectRoomId, projectRoomId } from '../src/lib/room-id';

test('projectRoomId formats the room name with the project prefix', () => {
  assert.equal(projectRoomId('abc-123'), 'project-abc-123');
});

test('parseProjectRoomId extracts the id from a well-formed room name', () => {
  assert.deepEqual(parseProjectRoomId('project-abc-123'), { projectId: 'abc-123' });
});

test('parseProjectRoomId returns null for rooms missing the prefix', () => {
  assert.equal(parseProjectRoomId('abc-123'), null);
  assert.equal(parseProjectRoomId(''), null);
  assert.equal(parseProjectRoomId('projekt-abc'), null);
});

test('parseProjectRoomId returns null when the id part is empty', () => {
  assert.equal(parseProjectRoomId('project-'), null);
});

test('parseProjectRoomId trims whitespace-only input', () => {
  assert.equal(parseProjectRoomId('   '), null);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/room-id.test.ts`
Expected: FAIL with module-not-found for `../src/lib/room-id`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/room-id.ts`:
```ts
const PROJECT_ROOM_PREFIX = 'project-';

export function projectRoomId(projectId: string): string {
  return `${PROJECT_ROOM_PREFIX}${projectId}`;
}

export function parseProjectRoomId(room: string): { projectId: string } | null {
  if (typeof room !== 'string') return null;
  const trimmed = room.trim();
  if (!trimmed.startsWith(PROJECT_ROOM_PREFIX)) return null;
  const projectId = trimmed.slice(PROJECT_ROOM_PREFIX.length);
  if (projectId.length === 0) return null;
  return { projectId };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/room-id.test.ts`
Expected: 5 passes, 0 fails.

- [ ] **Step 5: Commit**

```bash
git add src/lib/room-id.ts tests/room-id.test.ts
git commit -m "feat(collab): add project room-id helpers"
```

---

## Task 4: Server-side Liveblocks client

**Files:**
- Create: `src/lib/liveblocks-server.ts`

- [ ] **Step 1: Create the server client module**

Create `src/lib/liveblocks-server.ts`:
```ts
import { Liveblocks } from '@liveblocks/node';

let cached: Liveblocks | null = null;

export function getLiveblocksServer(): Liveblocks {
  if (cached) return cached;
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) {
    throw new Error('LIVEBLOCKS_SECRET_KEY is not set — required for the Liveblocks auth endpoint');
  }
  cached = new Liveblocks({ secret });
  return cached;
}
```

- [ ] **Step 2: Type-check it**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors referencing `src/lib/liveblocks-server.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/liveblocks-server.ts
git commit -m "feat(collab): add Liveblocks server client singleton"
```

---

## Task 5: Room-access resolver + tests (TDD)

This is the pure business logic the auth route will call. Extracting it makes it unit-testable without spinning up a Next request.

**Files:**
- Create: `src/lib/liveblocks-auth.ts`
- Test: `tests/liveblocks-auth.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/liveblocks-auth.test.ts`:
```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveRoomAccess, type RoomAccessInput, type RoomAccessResult } from '../src/lib/liveblocks-auth';

type FakeProject = { id: string; userId: string; collaborators: { userId: string; role: string }[] } | null;

function input(overrides: Partial<RoomAccessInput> & { project: FakeProject }): RoomAccessInput {
  return {
    userId: 'user-1',
    room: 'project-abc',
    loadProject: async () => overrides.project,
    ...overrides,
  };
}

test('resolveRoomAccess denies anonymous users', async () => {
  const result = await resolveRoomAccess({
    userId: null,
    room: 'project-abc',
    loadProject: async () => {
      throw new Error('should not be called for unauthenticated user');
    },
  });
  assert.deepEqual(result, { kind: 'unauthorized' } satisfies RoomAccessResult);
});

test('resolveRoomAccess rejects malformed room names', async () => {
  const result = await resolveRoomAccess(input({ project: null, room: 'not-a-project-room' }));
  assert.deepEqual(result, { kind: 'bad-room' });
});

test('resolveRoomAccess returns not-found when the project does not exist', async () => {
  const result = await resolveRoomAccess(input({ project: null }));
  assert.deepEqual(result, { kind: 'not-found' });
});

test('resolveRoomAccess grants full access to the project owner', async () => {
  const result = await resolveRoomAccess(
    input({
      project: { id: 'abc', userId: 'user-1', collaborators: [] },
    }),
  );
  assert.deepEqual(result, { kind: 'allow', access: 'full', projectId: 'abc' });
});

test('resolveRoomAccess grants full access to editor collaborators', async () => {
  const result = await resolveRoomAccess(
    input({
      project: { id: 'abc', userId: 'owner-1', collaborators: [{ userId: 'user-1', role: 'editor' }] },
    }),
  );
  assert.deepEqual(result, { kind: 'allow', access: 'full', projectId: 'abc' });
});

test('resolveRoomAccess grants read-only access to viewer collaborators', async () => {
  const result = await resolveRoomAccess(
    input({
      project: { id: 'abc', userId: 'owner-1', collaborators: [{ userId: 'user-1', role: 'viewer' }] },
    }),
  );
  assert.deepEqual(result, { kind: 'allow', access: 'read', projectId: 'abc' });
});

test('resolveRoomAccess denies non-collaborators', async () => {
  const result = await resolveRoomAccess(
    input({
      project: { id: 'abc', userId: 'owner-1', collaborators: [{ userId: 'someone-else', role: 'editor' }] },
    }),
  );
  assert.deepEqual(result, { kind: 'forbidden' });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/liveblocks-auth.test.ts`
Expected: FAIL with module-not-found for `../src/lib/liveblocks-auth`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/liveblocks-auth.ts`:
```ts
import { parseProjectRoomId } from './room-id';

type ProjectForAccess = {
  id: string;
  userId: string;
  collaborators: { userId: string; role: string }[];
};

export type RoomAccessInput = {
  userId: string | null;
  room: string;
  loadProject: (projectId: string) => Promise<ProjectForAccess | null>;
};

export type RoomAccessResult =
  | { kind: 'unauthorized' }
  | { kind: 'bad-room' }
  | { kind: 'not-found' }
  | { kind: 'forbidden' }
  | { kind: 'allow'; access: 'full' | 'read'; projectId: string };

export async function resolveRoomAccess(input: RoomAccessInput): Promise<RoomAccessResult> {
  if (!input.userId) {
    return { kind: 'unauthorized' };
  }

  const parsed = parseProjectRoomId(input.room);
  if (!parsed) {
    return { kind: 'bad-room' };
  }

  const project = await input.loadProject(parsed.projectId);
  if (!project) {
    return { kind: 'not-found' };
  }

  if (project.userId === input.userId) {
    return { kind: 'allow', access: 'full', projectId: project.id };
  }

  const collaborator = project.collaborators.find(c => c.userId === input.userId);
  if (!collaborator) {
    return { kind: 'forbidden' };
  }

  const access = collaborator.role === 'viewer' ? 'read' : 'full';
  return { kind: 'allow', access, projectId: project.id };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/liveblocks-auth.test.ts`
Expected: 7 passes, 0 fails.

- [ ] **Step 5: Commit**

```bash
git add src/lib/liveblocks-auth.ts tests/liveblocks-auth.test.ts
git commit -m "feat(collab): add room-access resolver with role-based permissions"
```

---

## Task 6: POST /api/liveblocks-auth route

**Files:**
- Create: `src/app/api/liveblocks-auth/route.ts`

- [ ] **Step 1: Create the route handler**

Create `src/app/api/liveblocks-auth/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { getLiveblocksServer } from '@/lib/liveblocks-server';
import { resolveRoomAccess } from '@/lib/liveblocks-auth';
import prisma from '@/lib/prisma';

type AuthRequestBody = { room?: unknown };

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  let body: AuthRequestBody;
  try {
    body = (await request.json()) as AuthRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const room = typeof body.room === 'string' ? body.room : '';
  if (!room) {
    return NextResponse.json({ error: 'Missing room' }, { status: 400 });
  }

  const result = await resolveRoomAccess({
    userId,
    room,
    loadProject: async (projectId: string) =>
      prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          userId: true,
          collaborators: { select: { userId: true, role: true } },
        },
      }),
  });

  if (result.kind === 'unauthorized') {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  if (result.kind === 'bad-room') {
    return NextResponse.json({ error: 'Invalid room' }, { status: 400 });
  }
  if (result.kind === 'not-found') {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  if (result.kind === 'forbidden') {
    return NextResponse.json({ error: 'No access to this project' }, { status: 403 });
  }

  const liveblocks = getLiveblocksServer();
  const lbSession = liveblocks.prepareSession(userId!, {
    userInfo: {
      name: session?.user?.name ?? session?.user?.email ?? 'Anonymous',
      avatar: session?.user?.image ?? undefined,
    },
  });

  if (result.access === 'full') {
    lbSession.allow(room, lbSession.FULL_ACCESS);
  } else {
    lbSession.allow(room, lbSession.READ_ACCESS);
  }

  const { status, body: tokenBody } = await lbSession.authorize();
  return new NextResponse(tokenBody, { status, headers: { 'Content-Type': 'application/json' } });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no type errors in the new route file.

- [ ] **Step 3: Smoke-test: unauthorized returns 401**

Start dev server (if not already running) via `npm run dev`, then in another terminal:
```bash
curl -sS -X POST http://localhost:3000/api/liveblocks-auth \
  -H 'content-type: application/json' \
  -d '{"room":"project-does-not-exist"}' -w '\n%{http_code}\n'
```

Expected: `{"error":"Sign in required"}` with status `401`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/liveblocks-auth/route.ts
git commit -m "feat(api): add /api/liveblocks-auth route with role-based permissions"
```

---

## Task 7: Remove signaling parser + update its tests

**Known intermediate-state note:** This task removes `parseCollaborationSignalingServers` while the original `CollaborativeEditor.tsx` still imports it. The build will fail after this commit and will be restored in Task 8 (the CollaborativeEditor rewrite, which no longer imports the parser). Do not release or run `npm run dev` between these two commits; execute both in one sitting. This keeps each commit small and focused on one concern.

**Files:**
- Modify: `src/lib/workspace-collaboration.ts` (remove one export)
- Modify: `tests/workspace-collaboration.test.ts` (drop two tests + one import)

- [ ] **Step 1: Delete parseCollaborationSignalingServers from workspace-collaboration.ts**

Edit `src/lib/workspace-collaboration.ts` and delete this block (lines 32–41):
```ts
export function parseCollaborationSignalingServers(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/[\n,]/)
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0);
}
```

Do not delete anything else in the file — the other helpers (`shouldPersistCollaborativeState`, `shouldApplyRemoteCollaborativeState`, `shouldReplaceStandaloneEditorValue`, `getSavedStatusLabel`) remain in use.

- [ ] **Step 2: Update tests/workspace-collaboration.test.ts**

Edit the imports at the top of `tests/workspace-collaboration.test.ts` — remove `parseCollaborationSignalingServers`:
```ts
import {
  getSavedStatusLabel,
  shouldApplyRemoteCollaborativeState,
  shouldPersistCollaborativeState,
  shouldReplaceStandaloneEditorValue,
} from '../src/lib/workspace-collaboration';
```

Then delete the two `parseCollaborationSignalingServers` tests (lines 12–23 in the current file — both `test(...)` blocks that reference it). Keep everything else.

- [ ] **Step 3: Run the non-broken unit tests**

Run: `npm test -- tests/workspace-collaboration.test.ts tests/room-id.test.ts tests/liveblocks-auth.test.ts`
Expected: all three files pass. Do not run the full `npm test` here because some suites may import from `CollaborativeEditor.tsx` transitively; the broken import will surface in Task 8 when the file is replaced.

- [ ] **Step 4: Commit**

```bash
git add src/lib/workspace-collaboration.ts tests/workspace-collaboration.test.ts
git commit -m "refactor(collab): drop WebRTC signaling parser"
```

---

## Task 8: Swap WebrtcProvider for LiveblocksYjsProvider in CollaborativeEditor

This is the core refactor. The existing `CollaborativeEditor` is ~500 lines of Yjs logic — we keep it almost entirely intact but split it so the outer component can mount Liveblocks providers.

**Files:**
- Modify: `src/components/CollaborativeEditor.tsx`

- [ ] **Step 1: Rewrite CollaborativeEditor.tsx**

Replace the entire contents of `src/components/CollaborativeEditor.tsx` with:
```tsx
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Buffer } from 'buffer';
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
  useRoom,
} from '@liveblocks/react/suspense';
import { LiveblocksYjsProvider } from '@liveblocks/yjs';
import { Awareness } from 'y-protocols/awareness';
import * as Y from 'yjs';

import { inferLanguage, type ProjectFile, type ProjectFileMap } from '@/lib/project';
import { projectRoomId } from '@/lib/room-id';
import type { CollaboratorPresence, LocalCollaboratorPresence } from '@/types/collaboration';

type CollaborativeEditorProps = {
  projectId: string | null;
  files: ProjectFileMap;
  onFilesChange: (files: ProjectFileMap) => void;
  encodedState?: string | null;
  onSnapshotChange?: (snapshot: string | null) => void;
  localPresence?: LocalCollaboratorPresence | null;
  onPresenceChange?: (presence: CollaboratorPresence[]) => void;
  onRemoteMutation?: () => void;
  children?: ReactNode;
};

type CollaborationContextValue = {
  getTextForPath: (path: string) => Y.Text | null;
  awareness: Awareness | null;
  isActive: boolean;
};

const LOCAL_ORIGIN = Symbol('collaboration-local');

const CollaborationContext = createContext<CollaborationContextValue>({
  getTextForPath: () => null,
  awareness: null,
  isActive: false,
});

export function useCollaboration() {
  return useContext(CollaborationContext);
}

/* -------------------------------- Utils ---------------------------------- */

function sanitizeProjectFile(raw: unknown): ProjectFile | null {
  if (!raw || typeof raw !== 'object') return null;
  const { path, language, code } = raw as Partial<ProjectFile> & {
    path?: unknown;
    language?: unknown;
    code?: unknown;
  };
  if (typeof path !== 'string' || path.trim().length === 0) return null;
  const normalizedPath = path.trim().slice(0, 260);
  const normalizedLanguage: ProjectFile['language'] =
    typeof language === 'string' && ['html', 'css', 'javascript', 'python', 'c', 'cpp', 'java'].includes(language.trim())
      ? (language.trim() as ProjectFile['language'])
      : inferLanguage(normalizedPath);
  const normalizedCode = typeof code === 'string' ? code : '';
  return { path: normalizedPath, language: normalizedLanguage, code: normalizedCode };
}

function sanitizeProjectMap(map: ProjectFileMap): ProjectFileMap {
  const result: ProjectFileMap = {};
  Object.values(map).forEach(file => {
    const sanitized = sanitizeProjectFile(file);
    if (sanitized) result[sanitized.path] = { ...sanitized };
  });
  return result;
}

function projectMapsEqual(left: ProjectFileMap, right: ProjectFileMap): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every(path => {
    const l = left[path];
    const r = right[path];
    if (!l || !r) return false;
    return l.path === r.path && l.language === r.language && l.code === r.code;
  });
}

function decodeSnapshotToMap(encoded: string): ProjectFileMap | null {
  try {
    const binary = typeof window === 'undefined' ? Buffer.from(encoded, 'base64').toString('utf-8') : atob(encoded);
    const parsed = JSON.parse(binary) as unknown;
    if (!Array.isArray(parsed)) return null;
    const out: ProjectFileMap = {};
    parsed.forEach(entry => {
      const sanitized = sanitizeProjectFile(entry);
      if (sanitized) out[sanitized.path] = { ...sanitized };
    });
    return out;
  } catch {
    return null;
  }
}

function encodeUpdate(update: Uint8Array): string {
  if (typeof window === 'undefined') return Buffer.from(update).toString('base64');
  let binary = '';
  update.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function decodeUpdate(encoded?: string | null): Uint8Array | null {
  if (!encoded) return null;
  try {
    const buffer = typeof window === 'undefined' ? Buffer.from(encoded, 'base64') : Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    return buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  } catch {
    return null;
  }
}

function applyFilesToMap(target: Y.Map<Y.Map<unknown>>, files: ProjectFileMap) {
  const seen = new Set<string>();
  Object.values(files).forEach(file => {
    let entry = target.get(file.path);
    if (!entry) {
      entry = new Y.Map();
      entry.set('text', new Y.Text());
      target.set(file.path, entry);
    }
    entry.set('language', file.language);
    const text = entry.get('text');
    if (text instanceof Y.Text) {
      const current = text.toString();
      if (current !== file.code) {
        text.delete(0, current.length);
        text.insert(0, file.code);
      }
    }
    seen.add(file.path);
  });
  Array.from(target.keys()).forEach(path => {
    if (!seen.has(path)) target.delete(path);
  });
}

function mapToProjectFileMap(target: Y.Map<Y.Map<unknown>>): ProjectFileMap {
  const snapshot: ProjectFileMap = {};
  target.forEach((entry, path) => {
    if (!(entry instanceof Y.Map)) return;
    const language = entry.get('language');
    const text = entry.get('text');
    const normalized: ProjectFile = {
      path,
      language:
        typeof language === 'string' && ['html', 'css', 'javascript', 'python', 'c', 'cpp', 'java'].includes(language)
          ? (language as ProjectFile['language'])
          : inferLanguage(path),
      code: text instanceof Y.Text ? text.toString() : '',
    };
    const sanitized = sanitizeProjectFile(normalized);
    if (sanitized) snapshot[path] = sanitized;
  });
  return snapshot;
}

function presenceFromAwareness(awareness: Awareness, localPresence?: LocalCollaboratorPresence | null): CollaboratorPresence[] {
  const localId = localPresence?.id ?? null;
  const states: CollaboratorPresence[] = [];
  awareness.getStates().forEach((state, clientId) => {
    const user = (state as { user?: LocalCollaboratorPresence | null } | undefined)?.user;
    if (!user || typeof user.id !== 'string' || user.id.length === 0) return;
    states.push({
      clientId: `yjs:${clientId}`,
      userId: user.id,
      name: user.name ?? null,
      color: user.color ?? null,
      avatar: user.avatar ?? null,
      isSelf: Boolean(localId && user.id === localId),
    });
  });
  return states;
}

/* ------------------------------ Component -------------------------------- */

export default function CollaborativeEditor(props: CollaborativeEditorProps) {
  const { projectId } = props;

  if (!projectId || typeof window === 'undefined') {
    return (
      <CollaborationContext.Provider
        value={{ getTextForPath: () => null, awareness: null, isActive: false }}
      >
        {props.children ?? null}
      </CollaborationContext.Provider>
    );
  }

  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider id={projectRoomId(projectId)}>
        <ClientSideSuspense fallback={<OfflineShell {...props} />}>
          <CollaborativeEditorInner {...props} />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}

function OfflineShell(props: CollaborativeEditorProps) {
  return (
    <CollaborationContext.Provider
      value={{ getTextForPath: () => null, awareness: null, isActive: false }}
    >
      {props.children ?? null}
    </CollaborationContext.Provider>
  );
}

function CollaborativeEditorInner({
  projectId,
  files,
  onFilesChange,
  encodedState,
  onSnapshotChange,
  localPresence,
  onPresenceChange,
  onRemoteMutation,
  children,
}: CollaborativeEditorProps) {
  const room = useRoom();

  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<LiveblocksYjsProvider | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const filesMapRef = useRef<Y.Map<Y.Map<unknown>> | null>(null);
  const suppressLocalSyncRef = useRef(false);
  const initialisedRef = useRef(false);
  const onFilesChangeRef = useRef(onFilesChange);
  const onSnapshotChangeRef = useRef(onSnapshotChange);
  const onPresenceChangeRef = useRef(onPresenceChange);
  const onRemoteMutationRef = useRef(onRemoteMutation);
  const filesRef = useRef(files);
  const encodedStateRef = useRef(encodedState);
  const localPresenceRef = useRef(localPresence);
  const lastEncodedStateRef = useRef<string | null | undefined>(encodedState);
  const [awareness, setAwareness] = useState<Awareness | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => { onFilesChangeRef.current = onFilesChange; }, [onFilesChange]);
  useEffect(() => { onSnapshotChangeRef.current = onSnapshotChange; }, [onSnapshotChange]);
  useEffect(() => { onPresenceChangeRef.current = onPresenceChange; }, [onPresenceChange]);
  useEffect(() => { onRemoteMutationRef.current = onRemoteMutation; }, [onRemoteMutation]);
  useEffect(() => { filesRef.current = files; }, [files]);
  useEffect(() => { encodedStateRef.current = encodedState; }, [encodedState]);
  useEffect(() => { localPresenceRef.current = localPresence; }, [localPresence]);

  const applySnapshotToParent = useCallback((snapshot: ProjectFileMap) => {
    if (projectMapsEqual(snapshot, filesRef.current)) return;
    suppressLocalSyncRef.current = true;
    onFilesChangeRef.current(snapshot);
    const doc = ydocRef.current;
    const encoded = doc ? encodeUpdate(Y.encodeStateAsUpdate(doc)) : null;
    onSnapshotChangeRef.current?.(encoded);
    queueMicrotask(() => { suppressLocalSyncRef.current = false; });
  }, []);

  useEffect(() => {
    const doc = new Y.Doc();
    ydocRef.current = doc;

    const initialEncodedState = encodedStateRef.current;
    const initialFiles = filesRef.current;
    const initialLocalPresence = localPresenceRef.current;

    const update = decodeUpdate(initialEncodedState);
    if (update) {
      try {
        Y.applyUpdate(doc, update);
      } catch (error) {
        console.error('[CollaborativeEditor] Failed to apply saved state', error);
      }
    } else {
      const legacy = initialEncodedState ? decodeSnapshotToMap(initialEncodedState) : null;
      if (legacy) {
        doc.transact(() => { applyFilesToMap(doc.getMap('files'), legacy); }, LOCAL_ORIGIN);
      }
    }

    const filesMap = doc.getMap<Y.Map<unknown>>('files');
    filesMapRef.current = filesMap;

    if (filesMap.size === 0) {
      const sanitized = sanitizeProjectMap(initialFiles);
      doc.transact(() => applyFilesToMap(filesMap, sanitized), LOCAL_ORIGIN);
    }

    const provider = new LiveblocksYjsProvider(room, doc);
    providerRef.current = provider;

    const awarenessInstance = provider.awareness as unknown as Awareness;
    awarenessRef.current = awarenessInstance;

    const handleAwarenessUpdate = () => {
      setAwareness(awarenessInstance);
      setIsActive(true);
      const presence = presenceFromAwareness(awarenessInstance, localPresenceRef.current);
      onPresenceChangeRef.current?.(presence);
    };

    awarenessInstance.setLocalStateField('user', initialLocalPresence ?? null);
    awarenessInstance.on('update', handleAwarenessUpdate);
    handleAwarenessUpdate();

    const handleDocUpdate = () => {
      onSnapshotChangeRef.current?.(encodeUpdate(Y.encodeStateAsUpdate(doc)));
    };

    const handleFilesChange = () => {
      const snapshot = mapToProjectFileMap(filesMap);
      applySnapshotToParent(snapshot);
      onRemoteMutationRef.current?.();
    };

    doc.on('update', handleDocUpdate);
    filesMap.observeDeep(handleFilesChange);

    applySnapshotToParent(mapToProjectFileMap(filesMap));
    initialisedRef.current = true;
    lastEncodedStateRef.current = initialEncodedState;

    return () => {
      filesMap.unobserveDeep(handleFilesChange);
      doc.off('update', handleDocUpdate);
      awarenessInstance.off('update', handleAwarenessUpdate);
      provider.destroy();
      providerRef.current = null;
      awarenessRef.current = null;
      doc.destroy();
      ydocRef.current = null;
      filesMapRef.current = null;
      initialisedRef.current = false;
      lastEncodedStateRef.current = null;
      setAwareness(null);
      setIsActive(false);
    };
  }, [applySnapshotToParent, room]);

  useEffect(() => {
    const awarenessInstance = awarenessRef.current;
    if (!awarenessInstance) return;
    awarenessInstance.setLocalStateField('user', localPresence ?? null);
  }, [localPresence]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const doc = ydocRef.current;
    const filesMap = filesMapRef.current;
    if (!doc || !filesMap) return;

    const incomingUpdate = decodeUpdate(encodedState);
    const isNewState = encodedState !== lastEncodedStateRef.current;
    lastEncodedStateRef.current = encodedState;
    if (!isNewState) return;

    if (incomingUpdate) {
      try {
        Y.applyUpdate(doc, incomingUpdate);
        return;
      } catch (error) {
        console.error('[CollaborativeEditor] Failed to apply saved state', error);
        return;
      }
    }

    if (encodedState) {
      const legacy = decodeSnapshotToMap(encodedState);
      if (legacy) {
        doc.transact(() => { applyFilesToMap(filesMap, legacy); }, LOCAL_ORIGIN);
      }
    }
  }, [encodedState]);

  useEffect(() => {
    if (suppressLocalSyncRef.current) return;
    const doc = ydocRef.current;
    const filesMap = filesMapRef.current;
    if (!doc || !filesMap) return;

    const sanitized = sanitizeProjectMap(files);
    const currentSnapshot = mapToProjectFileMap(filesMap);
    if (projectMapsEqual(sanitized, currentSnapshot)) return;

    doc.transact(() => applyFilesToMap(filesMap, sanitized), LOCAL_ORIGIN);
  }, [files]);

  const contextValue: CollaborationContextValue = {
    getTextForPath: (path: string) => {
      const filesMap = filesMapRef.current;
      if (!filesMap) return null;
      const entry = filesMap.get(path);
      const text = entry?.get('text');
      return text instanceof Y.Text ? text : null;
    },
    awareness,
    isActive,
  };

  return <CollaborationContext.Provider value={contextValue}>{children ?? null}</CollaborationContext.Provider>;
}
```

**Key diffs from the original:**
- Dropped `WebrtcProvider`, `parseCollaborationSignalingServers`, and the `SIGNALING_SERVERS` module-level constant.
- Added `LiveblocksProvider` + `RoomProvider` wrapper, `ClientSideSuspense` fallback for SSR/first-load, and inner component using `useRoom()`.
- `provider.awareness` from `LiveblocksYjsProvider` replaces `new Awareness(doc)` + `provider?.awareness ?? …` pattern. Liveblocks always provides an awareness instance, so the fallback path is gone.
- Effect dependency array switched from `[applySnapshotToParent, projectId]` to `[applySnapshotToParent, room]` — the room object is the correct identity; `projectId` is constant inside the inner component because remounts happen when `RoomProvider id` changes.
- Removed the `if (!projectId || typeof window === 'undefined')` branch inside effects — that case is now handled by the outer component returning `<OfflineShell/>` early. Effects only run when we have a room.

- [ ] **Step 2: Type-check the new file**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors. If `LiveblocksYjsProvider.awareness` has a type that doesn't structurally match `Awareness` from `y-protocols/awareness`, the `as unknown as Awareness` cast is intentional — they are the same runtime object.

- [ ] **Step 3: Commit**

```bash
git add src/components/CollaborativeEditor.tsx
git commit -m "feat(collab): swap WebrtcProvider for LiveblocksYjsProvider"
```

---

## Task 9: Manual smoke test — two-window sync + role enforcement

No unit tests for this layer — it requires a live room. Use the dev server and a real Liveblocks project.

**Prerequisite:** `LIVEBLOCKS_SECRET_KEY` and `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` in `.env.local` are both populated with matching keys from the same Liveblocks project.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: server boots on `localhost:3000`, no errors about missing Liveblocks keys.

- [ ] **Step 2: Golden path — two windows, same owner**

1. Sign in as the project owner. Open `/<workspaceId>` in Chrome.
2. Open the same URL in a second window (same user, same session).
3. Type in the editor in window 1. Confirm the text appears in window 2 within ~1s.
4. Confirm presence avatar shows the user in both windows.
5. Reload window 1. Confirm the text is still there (served from Prisma `yjsState`).

- [ ] **Step 3: Edge path — unauthorized user gets 403**

1. Sign out. Open a new project URL you don't own.
2. Watch the Network tab for `/api/liveblocks-auth` — expect a 401 or 403 response.
3. Confirm the editor shows the Suspense fallback and does not crash.

- [ ] **Step 4: Edge path — viewer role is read-only**

1. Add a collaborator with role `viewer` via your usual admin path (or directly in Prisma).
2. Have that user open the project. Editor should mount.
3. Confirm they CANNOT successfully make edits that persist (Liveblocks will reject write ops with `room:write` missing).

- [ ] **Step 5: Commit only if smoke tests passed**

If a smoke test fails, stop and fix before moving on. If all pass, no commit needed — no code changed in this task.

---

## Task 10: Run the full test suite and final cleanup

- [ ] **Step 1: Run all unit tests**

Run: `npm test`
Expected: all tests pass, including the new `room-id` and `liveblocks-auth` tests. Previously-removed signaling tests do not appear.

- [ ] **Step 2: Run Playwright e2e if your environment supports it**

Run: `npm run test:e2e`
Expected: `project-collaboration.test.ts` passes. If it assumes WebRTC-only behavior (signaling env checks, peer counts, etc.), update the assertions inline and commit the fix separately. If it only tests snapshot persistence via the REST API, it will pass unchanged.

- [ ] **Step 3: Type-check the whole project**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: zero errors.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: zero errors.

- [ ] **Step 5: Verify no stray y-webrtc references**

Run:
```bash
grep -rn --exclude-dir=node_modules --exclude-dir=.next "y-webrtc\|WebrtcProvider\|NEXT_PUBLIC_COLLAB_SIGNALING\|parseCollaborationSignalingServers" .
```

Expected: no output (all references removed).

- [ ] **Step 6: Final commit if any fixups were made**

```bash
git status
git add -A   # only if you made fixups in steps 2–4
git commit -m "chore: final cleanup after liveblocks migration"
```

---

## Rollback

If the migration needs to be reverted:
- `git revert` the commits from Tasks 1–8 in reverse order.
- Restore `y-webrtc` and `y-websocket`: `npm install y-webrtc@^10.3.0 y-websocket@^1.3.15`.
- Restore `NEXT_PUBLIC_COLLAB_SIGNALING` in deployment env.

The Prisma `yjsState` column is unchanged by this migration, so existing project data is safe either way.
