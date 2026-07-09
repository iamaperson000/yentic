# Real C/C++ Execution (clang-in-WASM) — Design

**Date:** 2026-07-08
**Status:** Approved by user (browser-side, delete old runners, Java deferred)

## Problem

`src/lib/runners.ts` executes C via JSCPP (a subset interpreter), C++ via JSCPP with a regex-transpile-to-JavaScript fallback, and Java via regex-transpile-to-JavaScript. The C++ fallback and Java path produce silently wrong results (e.g. JS float division where integer division is expected) — unacceptable for a beginner audience. Python (Pyodide) and web (Sandpack) are genuinely real and unaffected.

## Decision

Compile and run C and C++ with **real clang in the browser** via the Wasmer JS SDK (`@wasmer/sdk` + Wasmer's clang package). Delete the JSCPP and regex-transpile paths for C/C++. **Java is out of scope** — its existing (fake) path remains until its own replacement project; this spec must not break it.

Why browser-side: matches the product identity ("all in the tab"), zero server cost/abuse surface for a free product, and the free public execution APIs are gone (Piston restricted access in Feb 2026). Precedent: Stanford's 2025 fully client-side C++ IDE for intro CS.

## Architecture

### New module: `src/lib/wasmClang.ts`

Owns all Wasmer concerns. Public interface:

```ts
export type RunPhase = 'downloading' | 'compiling' | 'running';
export function compileAndRun(
  language: 'c' | 'cpp',
  source: string,
  stdin: string,
  onProgress?: (phase: RunPhase, pct?: number) => void
): Promise<RunResult>;   // RunResult = { stdout: string; stderr: string }
```

Internals:
- Lazy `import('@wasmer/sdk')` + one-time clang package fetch from the Wasmer registry, with download progress surfaced via `onProgress`. Toolchain instance cached module-level (same pattern as `ensurePyodide`).
- Compile: in-memory FS, `clang`/`clang++` with `-O0`, source file `main.c`/`main.cpp`, output `out.wasm`. Clang's stderr (real diagnostics with line numbers) becomes `RunResult.stderr` on failure.
- Run: instantiate `out.wasm` with WASI; `stdin` passed as a batch string (matches the existing ConsoleInputPanel queue model); stdout/stderr captured.
- Timeout: execution runs in a terminable worker; default 15s, then `stderr: 'Program took too long (15s limit) and was stopped.'`
- Guard: if `typeof SharedArrayBuffer === 'undefined'` or `!crossOriginIsolated`, reject with a loader error (see Error handling).

### `src/lib/runners.ts` (shrinks to a dispatcher)

- `executeCode('c' | 'cpp', …)` → `wasmClang.compileAndRun(…)`, threading a new optional `onProgress` parameter through.
- DELETE: `JSCPP` import and dependency, `executeWithJscpp`, `executeC`, `executeCpp`, `transpileCToJavaScript`, `transpileCppToJavaScript`, `convertCppStream`, `splitCppStream`, `normalizeCFunctionParameters`, `normalizeCSourceForInterpreter`, `ensureProcessStdout`, and `formatCPrintf` **if** no longer referenced (Java's `executeJava` also uses `formatC` — keep whatever Java still needs).
- KEEP untouched: `executePython`/Pyodide plumbing, `executeJava` and its helpers, `normalizePythonError`.
- Remove `JSCPP` from `package.json` only if Java's path doesn't use it (it doesn't — verify at implementation time).

### Cross-origin isolation (COOP/COEP)

- Add headers **scoped to IDE-family routes only**: `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: credentialless` (fall back to `require-corp` + `crossorigin` attributes if `credentialless` proves insufficient).
- Route scoping detail: `/ide/:path*` and `/project/:path*` are plain matchers. The workspace surface lives at the root-level dynamic route `/[workspaceId]`, so it needs a regex matcher with a negative lookahead excluding the known top-level pages (`features|privacy|projects|roadmap|signup|terms|users|collab|collab-demo|setup-profile|u|api|_next` and `/` itself). A workspace-id format guard (if ids have a known shape) is preferred if available — verify id shape at implementation time.
- Marketing, signup (Google OAuth), collab demo, and API routes keep current headers.
- Because the app serves through the custom `server.js` → Next handler, headers go in `next.config.ts` `headers()`; verify they survive the custom server path.
- **Verification gate (blocking):** on the isolated routes, Pyodide must still load and run, Monaco must render, Liveblocks presence must connect, and fonts must load. If any fail under `credentialless` and `require-corp`, STOP and re-design asset loading before proceeding.

### UI: `src/components/ExecutablePreview.tsx`

- New visible states driven by `onProgress`: "Downloading the C/C++ compiler — one-time, ~30 MB (N%)", "Compiling…", "Running…".
- Add the missing `cpp` case to the runner-label switch ("C++ Runner") — existing audit finding in the same component.
- Loader failures render as a distinct, retryable state, not as program output.

## Error handling

| Failure | Surface |
|---|---|
| No SAB / not cross-origin isolated | "This browser can't run the C/C++ compiler. Try a current Chrome, Firefox, or Safari." |
| Toolchain download fails (offline/CDN) | "Couldn't download the compiler. Check your connection and press Run to retry." (retry re-invokes lazy init) |
| Compile error | clang stderr verbatim (line-numbered diagnostics) |
| Nonzero exit | append `Program exited with code N` (matches current behavior) |
| Timeout (15s) | "Program took too long (15s limit) and was stopped." |

## Testing

- **Real-semantics canaries (Playwright, real browser):**
  - C: `printf("%d\n", 7 / 2);` prints `3` (not `3.5`).
  - C++: program using `std::vector`, `std::string`, `std::cout` formatting — beyond the old JSCPP subset — compiles and runs correctly.
  - stdin: program reading `scanf`/`std::cin` from queued console input produces correct output.
  - Compile error shows a clang diagnostic containing the source line number.
- **Isolation regressions (Playwright):** on `/ide/python` under new headers, Pyodide executes `print("ok")`; workspace route loads Monaco; collab presence connects.
- **Unit (`npm test`):** dispatcher routes c/cpp to `wasmClang` (mocked), Python/Java paths unchanged.
- Existing suite (63 tests) must stay green.

## Out of scope

- Java replacement (separate project; current Java path must keep working).
- Multi-file C/C++ projects, optimization flags, interactive (character-at-a-time) stdin.
- Self-hosting the clang package (start with Wasmer registry; revisit if reliability demands).
- Marketing copy updates (picked up by the planned copy-fix pass).

## Risks

- **COEP breakage** on IDE routes is the main risk; it has a blocking verification gate above.
- **Wasmer registry availability**: third-party CDN dependency for the toolchain; failure mode is the retryable loader error, and self-hosting is the documented escape hatch.
- **Download size** (~30MB compressed) on first C/C++ run: mitigated by progress UI, browser caching, and the fact that Python/web users never pay it.
