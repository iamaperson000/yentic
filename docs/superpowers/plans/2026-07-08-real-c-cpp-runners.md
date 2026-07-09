# Real C/C++ Execution (clang-in-WASM) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the JSCPP/regex-transpile C and C++ runners with real clang compilation in the browser via the Wasmer JS SDK, per `docs/superpowers/specs/2026-07-08-real-c-cpp-runners-design.md`.

**Architecture:** New `src/lib/wasmClang.ts` owns all Wasmer concerns behind `compileAndRun()`; `runners.ts` becomes a dispatcher and loses ~450 lines of fake execution; COOP/COEP headers are scoped to IDE-family routes in `next.config.ts`; `ExecutablePreview.tsx` gains download/compile/run progress states.

**Tech Stack:** `@wasmer/sdk` (clang package `clang/clang` from the Wasmer registry), Next.js 16 `headers()`, node:test for unit tests, Playwright (already configured, port 3001) for browser canaries.

## Global Constraints

- **Java must keep working untouched**: `executeJava`, `JAVA_SCANNER_RUNTIME`, `extractJavaMainBody`, `transpileJavaToJavaScript`, and `formatCPrintf` (Java uses it) stay in `runners.ts`.
- **Python/Pyodide path untouched** — including the HeroCode homepage call site (`executeCode('python', code)`), which runs on a NON-isolated route and must keep working.
- Error copy (exact strings, from spec): browser guard → `This browser can't run the C/C++ compiler. Try a current Chrome, Firefox, or Safari.`; download failure → `Couldn't download the compiler. Check your connection and press Run to retry.`; timeout → `Program took too long (15s limit) and was stopped.`
- Isolation headers: `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: credentialless` (fallback `require-corp`), ONLY on `/ide/*`, `/project/*`, and the root-level workspace route — never on `/`, `/signup`, `/collab*`, `/api/*`.
- **Blocking gate (spec):** if Pyodide, Monaco, or Liveblocks break under the headers on IDE routes, STOP — do not proceed to Task 4/5; re-design asset loading first.
- Known deviation to document, not fix, in v1: timeout uses `Promise.race` — a runaway program's worker may keep spinning until page reload (SDK exposes no public kill). Noted in code comment.
- The dev server (`node server.js`, port 3000) must be RESTARTED after `next.config.ts` changes.

---

### Task 1: `wasmClang.ts` module + dependency

**Files:**
- Create: `src/lib/wasmClang.ts`
- Modify: `package.json` (add `@wasmer/sdk`)
- Test: `tests/wasm-clang.test.ts`

**Interfaces:**
- Consumes: `RunResult` type from `./runners` (type-only import — no runtime cycle).
- Produces (Tasks 2 & 4 rely on these): `compileAndRun(language: 'c' | 'cpp', source: string, stdin: string, onProgress?: ProgressCallback): Promise<RunResult>`; `type RunPhase = 'downloading' | 'compiling' | 'running'`; `type ProgressCallback = (phase: RunPhase) => void`.

- [ ] **Step 1: Install the SDK**

Run: `npm install @wasmer/sdk`
Expected: added to dependencies; lockfile updated.

- [ ] **Step 2: Write the failing test**

Create `tests/wasm-clang.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileAndRun } from '../src/lib/wasmClang';

test('wasmClang requires a browser runtime in Node tests', async () => {
  await assert.rejects(
    () => compileAndRun('c', 'int main(){return 0;}', ''),
    /only available in the browser/
  );
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx tsx --test tests/wasm-clang.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Write the module**

Create `src/lib/wasmClang.ts`:

```ts
import type { RunResult } from './runners';

export type RunPhase = 'downloading' | 'compiling' | 'running';
export type ProgressCallback = (phase: RunPhase) => void;

const EXECUTION_TIMEOUT_MS = 15_000;
const CLANG_PACKAGE = 'clang/clang';

const BROWSER_GUARD_MESSAGE =
  "This browser can't run the C/C++ compiler. Try a current Chrome, Firefox, or Safari.";
const DOWNLOAD_FAILURE_MESSAGE =
  'Couldn\'t download the compiler. Check your connection and press Run to retry.';
const TIMEOUT_MESSAGE = 'Program took too long (15s limit) and was stopped.';

type WasmerRunOptions = {
  args?: string[];
  stdin?: string;
  mount?: Record<string, unknown>;
};

type WasmerOutcome = { ok: boolean; code: number; stdout: string; stderr: string };

type WasmerCommand = {
  run(options?: WasmerRunOptions): Promise<{ wait(): Promise<WasmerOutcome> }>;
};

type WasmerPackage = {
  entrypoint?: WasmerCommand;
  commands?: Record<string, WasmerCommand>;
};

type WasmerModule = {
  init(): Promise<unknown>;
  Wasmer: {
    fromRegistry(name: string): Promise<WasmerPackage>;
    fromFile(bytes: Uint8Array): Promise<WasmerPackage>;
  };
  Directory: new () => {
    writeFile(path: string, contents: string): Promise<void>;
    readFile(path: string): Promise<Uint8Array>;
  };
};

let sdkPromise: Promise<WasmerModule> | null = null;
let clangPromise: Promise<WasmerPackage> | null = null;

function assertBrowserSupport(): void {
  if (typeof window === 'undefined') {
    throw new Error('The C/C++ compiler is only available in the browser.');
  }
  if (typeof SharedArrayBuffer === 'undefined' || !globalThis.crossOriginIsolated) {
    throw new Error(BROWSER_GUARD_MESSAGE);
  }
}

async function ensureSdk(): Promise<WasmerModule> {
  if (!sdkPromise) {
    sdkPromise = (async () => {
      const sdk = (await import('@wasmer/sdk')) as unknown as WasmerModule;
      await sdk.init();
      return sdk;
    })().catch(error => {
      sdkPromise = null;
      throw error;
    });
  }
  return sdkPromise;
}

async function ensureClang(sdk: WasmerModule): Promise<WasmerPackage> {
  if (!clangPromise) {
    clangPromise = sdk.Wasmer.fromRegistry(CLANG_PACKAGE).catch(error => {
      clangPromise = null;
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`${DOWNLOAD_FAILURE_MESSAGE} (${detail})`);
    });
  }
  return clangPromise;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    // Known v1 limitation: this abandons (does not kill) the SDK's worker on
    // timeout; the runaway program stops consuming the UI but may spin until
    // the page reloads.
    const timer = setTimeout(() => reject(new Error(TIMEOUT_MESSAGE)), ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export async function compileAndRun(
  language: 'c' | 'cpp',
  source: string,
  stdin: string,
  onProgress?: ProgressCallback
): Promise<RunResult> {
  assertBrowserSupport();

  onProgress?.('downloading');
  const sdk = await ensureSdk();
  const clang = await ensureClang(sdk);

  onProgress?.('compiling');
  const project = new sdk.Directory();
  const fileName = language === 'c' ? 'main.c' : 'main.cpp';
  await project.writeFile(fileName, source);

  const compiler =
    (language === 'cpp' ? clang.commands?.['clang++'] : undefined) ?? clang.entrypoint;
  if (!compiler) {
    return { stdout: '', stderr: 'Compiler package has no runnable entrypoint.' };
  }

  const compileInstance = await compiler.run({
    args: [`/project/${fileName}`, '-O0', '-o', '/project/out.wasm'],
    mount: { '/project': project },
  });
  const compiled = await compileInstance.wait();
  if (!compiled.ok) {
    return {
      stdout: '',
      stderr: compiled.stderr.trim() || `Compilation failed (exit ${compiled.code}).`,
    };
  }

  onProgress?.('running');
  const wasm = await project.readFile('out.wasm');
  const program = await sdk.Wasmer.fromFile(wasm);
  if (!program.entrypoint) {
    return { stdout: '', stderr: 'Compiled program has no entrypoint.' };
  }

  try {
    const runInstance = await program.entrypoint.run({ stdin });
    const outcome = await withTimeout(runInstance.wait(), EXECUTION_TIMEOUT_MS);
    let stderr = outcome.stderr;
    if (!outcome.ok && outcome.code !== 0) {
      stderr = `${stderr}${stderr && !stderr.endsWith('\n') ? '\n' : ''}Program exited with code ${outcome.code}\n`;
    }
    return { stdout: outcome.stdout, stderr };
  } catch (error) {
    return {
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
    };
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx tsx --test tests/wasm-clang.test.ts`
Expected: PASS (guard rejects in Node).

- [ ] **Step 6: Lint and commit**

Run: `npm run lint` — expected: no NEW problems (5 pre-existing errors in `liveblocks.config.ts` + 1 warning are known).

```bash
git add src/lib/wasmClang.ts tests/wasm-clang.test.ts package.json package-lock.json
git commit -m "Add wasmClang module: real clang compile+run via Wasmer SDK"
```

---

### Task 2: Rewire `runners.ts`, delete fake C/C++ paths, migrate tests

**Files:**
- Modify: `src/lib/runners.ts`
- Modify: `tests/runners.test.ts`
- Modify: `package.json` (remove `JSCPP`)

**Interfaces:**
- Consumes: `compileAndRun`, `ProgressCallback`, `RunPhase` from `./wasmClang` (Task 1).
- Produces: `executeCode(language: ExecutableLanguage, source: string, stdin?: string, onProgress?: ProgressCallback): Promise<RunResult>` — 4th param is NEW and optional; existing 2-arg (HeroCode) and 3-arg (Preview, ExecutablePreview) call sites keep compiling unchanged. Re-export: `export type { RunPhase, ProgressCallback } from './wasmClang';`

- [ ] **Step 1: Update the failing tests first**

In `tests/runners.test.ts`, DELETE these five tests (they exercise deleted code paths):
- `'C runner handles empty parameter main signature'`
- `'C runner handles void parameter main signature'`
- `'C runner normalizes void parameters in helper functions'`
- `'C runner accepts stdin for scanf usage'`
- `'C++ runner accepts stdin for cin usage'`

ADD these two (same file, alongside the existing Python browser-guard test):

```ts
test('C runner requires a browser runtime in Node tests', async () => {
  await assert.rejects(
    () => executeCode('c', '#include <stdio.h>\nint main(void){printf("x");return 0;}'),
    /only available in the browser/
  );
});

test('C++ runner requires a browser runtime in Node tests', async () => {
  await assert.rejects(
    () => executeCode('cpp', '#include <iostream>\nint main(){std::cout << 1;return 0;}'),
    /only available in the browser/
  );
});
```

Leave the Java, Python, and unsupported-language tests untouched.

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm test`
Expected: the two new tests FAIL (C/C++ still run via JSCPP in Node and resolve instead of rejecting).

- [ ] **Step 3: Rewrite `runners.ts` C/C++ handling**

In `src/lib/runners.ts`:

1. DELETE: the `import JSCPP from 'JSCPP';` line; functions `executeWithJscpp`, `executeC`, `executeCpp`, `transpileCToJavaScript`, `transpileCppToJavaScript`, `convertCppStream`, `splitCppStream`, `normalizeCFunctionParameters`, `normalizeCSourceForInterpreter`, `ensureProcessStdout`; the `ProcessStub` type.
2. KEEP: `formatCPrintf` (Java embeds it), all Java functions/constants, all Python/Pyodide code, `normalizePythonError`.
3. ADD at top: `import type { ProgressCallback } from './wasmClang';` and `export type { RunPhase, ProgressCallback } from './wasmClang';`
4. Replace `executeCode` with:

```ts
export async function executeCode(
  language: ExecutableLanguage,
  source: string,
  stdin: string = '',
  onProgress?: ProgressCallback
): Promise<RunResult> {
  if (!supportedLanguages.has(language)) {
    throw new Error(`Unsupported language: ${language}`);
  }
  if (language === 'python') {
    return executePython(source);
  }
  if (language === 'c' || language === 'cpp') {
    const { compileAndRun } = await import('./wasmClang');
    return compileAndRun(language, source, stdin, onProgress);
  }
  if (language === 'java') {
    return executeJava(source, stdin);
  }
  throw new Error(`Unsupported language: ${language}`);
}
```

- [ ] **Step 4: Remove the JSCPP dependency**

Run: `npm uninstall JSCPP`
Then: `grep -rn 'JSCPP' src/ package.json` — expected: no output.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: ALL pass, including the two new browser-guard tests (dynamic import of wasmClang rejects in Node via `assertBrowserSupport`). Note: the c/cpp Node rejection surfaces `'The C/C++ compiler is only available in the browser.'` — matches `/only available in the browser/`.

- [ ] **Step 6: Lint and commit**

Run: `npm run lint` — expected: no new problems.

```bash
git add src/lib/runners.ts tests/runners.test.ts package.json package-lock.json
git commit -m "Route C/C++ through wasmClang; delete JSCPP and regex-transpile runners"
```

---

### Task 3: COOP/COEP headers on IDE-family routes + BLOCKING verification gate

**Files:**
- Modify: `next.config.ts`

**Interfaces:** none consumed; produces cross-origin-isolated IDE routes that Task 5's canaries depend on.

- [ ] **Step 1: Add scoped headers**

Replace the config object in `next.config.ts` with:

```ts
import type { NextConfig } from "next";

const isolationHeaders = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
];

// Top-level pages that must NOT get isolation headers (the workspace route
// is a root-level dynamic segment, so it needs an exclusion list).
const nonWorkspaceTopLevel = [
  "features", "privacy", "projects", "roadmap", "signup", "terms",
  "users", "collab", "collab-demo", "setup-profile", "u", "api",
  "ide", "project", "favicon.ico",
].join("|");

const nextConfig: NextConfig = {
  // Allow LAN devices (e.g. a phone) to load /_next/* dev resources in `next dev`.
  allowedDevOrigins: ['192.168.31.193'],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "pbs.twimg.com" },
    ],
  },
  async headers() {
    return [
      { source: "/ide/:path*", headers: isolationHeaders },
      { source: "/ide", headers: isolationHeaders },
      { source: "/project/:path*", headers: isolationHeaders },
      {
        source: `/:workspaceId((?!(?:${nonWorkspaceTopLevel})$).+)`,
        headers: isolationHeaders,
      },
    ];
  },
};

export default nextConfig;
```

Note: the existing `allowedDevOrigins` IP (`192.168.179.210`) is stale — today's LAN IP is `192.168.31.193`; update it as shown.

- [ ] **Step 2: Restart the dev server**

The running server (PID from `lsof -nP -iTCP:3000 -sTCP:LISTEN`) predates the config change:

```bash
kill <PID> && sleep 2 && npm run dev   # run in background
```

Expected: server up on :3000.

- [ ] **Step 3: Verify header scoping with curl**

```bash
curl -sI localhost:3000/ide           | grep -ci 'cross-origin'   # expected: 2
curl -sI localhost:3000/ide/python    | grep -ci 'cross-origin'   # expected: 2
curl -sI localhost:3000/some-ws-id    | grep -ci 'cross-origin'   # expected: 2
curl -sI localhost:3000/              | grep -ci 'cross-origin'   # expected: 0
curl -sI localhost:3000/signup        | grep -ci 'cross-origin'   # expected: 0
curl -sI localhost:3000/collab-demo   | grep -ci 'cross-origin'   # expected: 0
curl -sI localhost:3000/features      | grep -ci 'cross-origin'   # expected: 0
```

- [ ] **Step 4: BLOCKING browser gate — Pyodide/Monaco under isolation**

Playwright one-off (or `tests/e2e` temp spec): open `/ide/python` workspace, evaluate `crossOriginIsolated` (expected `true`), run a Python cell (`print("ok")` → output `ok`), open a workspace route and assert Monaco renders (`.monaco-editor` visible), and confirm the workspace's collab/save status does not show a connection error (Liveblocks websocket under COEP — check the topbar sync label doesn't read "Sync issue" while signed-out local mode shows its normal state). If Pyodide, Monaco, or Liveblocks fails under `credentialless`: switch the COEP value to `require-corp` and retest; if still broken, STOP THE PLAN and go back to design.

- [ ] **Step 5: Commit**

```bash
git add next.config.ts
git commit -m "Scope COOP/COEP isolation headers to IDE-family routes"
```

---

### Task 4: `ExecutablePreview` progress states + C/C++ UX

**Files:**
- Modify: `src/components/ExecutablePreview.tsx`

**Interfaces:**
- Consumes: `executeCode(language, source, input, onProgress)` and `RunPhase` from `@/lib/runners` (Task 2).

- [ ] **Step 1: Apply the component changes**

1. Import type: `import type { RunPhase } from '@/lib/runners';`
2. Add phase state: `const [phase, setPhase] = useState<RunPhase | null>(null);`
3. In `run()`, thread progress and reset phase:

```ts
setState(prev => ({ status: 'running', output: prev.output, error: '' }));
setPhase(null);
try {
  const result = await executeCode(language, source, input, nextPhase => setPhase(nextPhase));
  ...
} finally {
  setPhase(null);
}
```

(Add the `finally` around the existing try/catch tail so `phase` clears on both paths.)

4. Runner label switch: add `case 'cpp': return 'C++ Runner';` (missing today — C++ users see bare "Runner").
5. Auto-run default off for compiled languages (compiles take seconds; per-keystroke recompiles would thrash):

```ts
const [autoRun, setAutoRun] = useState(language !== 'c' && language !== 'cpp');
```

6. Status labels — replace the current `statusLabel` and the duplicate "Processing…" span:

```ts
const statusLabel =
  state.status === 'running'
    ? phase === 'downloading'
      ? 'Downloading the C/C++ compiler — one-time, ~30 MB…'
      : phase === 'compiling'
        ? 'Compiling…'
        : 'Running…'
    : state.status === 'ready'
      ? 'Output'
      : 'Idle';
```

and change the right-hand running indicator to a plain pulse with no second label (removes the "Running…/Processing…" double-spinner, an audit finding):

```tsx
{state.status === 'running' && <span className="animate-pulse text-white/50">●</span>}
```

- [ ] **Step 2: Verify in the browser**

Dev server: open `/ide/c`, paste `#include <stdio.h>\nint main(void){printf("%d\\n", 7/2);return 0;}`, press "Run now".
Expected sequence: "Downloading the C/C++ compiler — one-time, ~30 MB…" (first run only) → "Compiling…" → "Running…" → Output `3`. Auto-run checkbox starts UNCHECKED on C/C++; open `/ide/python` and confirm it starts CHECKED and Python still runs.

- [ ] **Step 3: Lint and commit**

Run: `npm run lint` — expected: no new problems.

```bash
git add src/components/ExecutablePreview.tsx
git commit -m "ExecutablePreview: compiler progress states, C++ label, no auto-run for compiled languages"
```

---

### Task 5: Real-semantics canaries (Playwright) + full verification

**Files:**
- Create: `tests/e2e/real-runners.spec.ts`
- Possibly modify: `tests/e2e/local-workspace.spec.ts` (its C execution assertion now runs real clang — first-run compiler download may need a timeout bump on the output expectation).

**Interfaces:** consumes the running app only.

- [ ] **Step 1: Write the canary spec**

Create `tests/e2e/real-runners.spec.ts` (mirror navigation from `local-workspace.spec.ts`; Monaco input via `page.keyboard` after clicking the editor, or the workspace's file-content testids if present — follow the existing spec's editing pattern):

```ts
import { expect, test } from '@playwright/test';

// First C/C++ run downloads the ~30MB toolchain; allow generous time.
const COMPILE_TIMEOUT = 180_000;

test('C runs with real integer semantics (7/2 === 3)', async ({ page }) => {
  test.setTimeout(COMPILE_TIMEOUT + 60_000);
  await page.goto('/ide/c');
  await expect(page.locator('.monaco-editor').first()).toBeVisible();
  // Assert isolation is actually on — the compiler cannot work without it.
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);

  await page.locator('.monaco-editor').first().click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('#include <stdio.h>\nint main(void){printf("%d\\n", 7/2);return 0;}');
  await page.getByRole('button', { name: 'Run now' }).click();

  await expect(page.locator('pre', { hasText: /^3$/ })).toBeVisible({ timeout: COMPILE_TIMEOUT });
});

test('C++ std::vector/std::string program runs (beyond old JSCPP subset)', async ({ page }) => {
  test.setTimeout(COMPILE_TIMEOUT + 60_000);
  await page.goto('/ide/cpp');
  await expect(page.locator('.monaco-editor').first()).toBeVisible();

  await page.locator('.monaco-editor').first().click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(
    '#include <iostream>\n#include <vector>\n#include <string>\nint main(){std::vector<std::string> v{"real","clang"};for(const auto& s : v) std::cout << s << " ";std::cout << v.size() << std::endl;return 0;}'
  );
  await page.getByRole('button', { name: 'Run now' }).click();

  await expect(page.locator('pre', { hasText: 'real clang 2' })).toBeVisible({ timeout: COMPILE_TIMEOUT });
});

test('compile errors show clang diagnostics with line numbers', async ({ page }) => {
  test.setTimeout(COMPILE_TIMEOUT + 60_000);
  await page.goto('/ide/c');
  await expect(page.locator('.monaco-editor').first()).toBeVisible();

  await page.locator('.monaco-editor').first().click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('int main(void){int x = ;return 0;}');
  await page.getByRole('button', { name: 'Run now' }).click();

  // clang diagnostic format: "main.c:1:24: error: ..."
  await expect(page.locator('pre', { hasText: /main\.c:\d+:\d+: error/ })).toBeVisible({
    timeout: COMPILE_TIMEOUT,
  });
});

test('Python still runs on isolated route (COEP regression)', async ({ page }) => {
  await page.goto('/ide/python');
  await expect(page.locator('.monaco-editor').first()).toBeVisible();
  await page.locator('.monaco-editor').first().click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('print("pyodide-ok")');
  await page.getByRole('button', { name: 'Run now' }).click();
  await expect(page.locator('pre', { hasText: 'pyodide-ok' })).toBeVisible({ timeout: 120_000 });
});
```

Adjust selectors to match the actual DOM if `Run now`/`pre` differ — but keep the assertions (output text, diagnostic regex, `crossOriginIsolated === true`) exactly.

Note: Playwright's webServer (see `playwright.config.ts`) must serve the same headers — it boots the app on port 3001 through the same Next config, so headers apply. Also verify a C++ workspace exists at `/ide/cpp`; if the slug differs (check `src/lib/project.ts` `workspaceConfigs` keys), use that slug.

- [ ] **Step 2: Run the canaries**

Run: `npm run test:e2e -- real-runners`
Expected: 4/4 pass. First C test is slow (toolchain download); subsequent ones reuse the cached toolchain within the same browser context.

- [ ] **Step 3: Run everything**

```bash
npm run lint      # no new problems
npm test          # all unit tests pass
npm run test:e2e  # full e2e including existing local-workspace spec
```

If `local-workspace.spec.ts` times out on its C execution step (now real clang), bump only that expectation's timeout to 180_000 and re-run.

- [ ] **Step 4: stdin canary (manual, dev server)**

On `/ide/c`: program `#include <stdio.h>\nint main(void){int n;scanf("%d",&n);printf("%d\\n",n*2);return 0;}`, stdin textarea `21` → Run → output `42`.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/real-runners.spec.ts tests/e2e/local-workspace.spec.ts
git commit -m "Add real-semantics e2e canaries for clang-in-WASM runners"
```
