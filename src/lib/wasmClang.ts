import type { RunResult } from './runners';

export type RunPhase = 'downloading' | 'compiling' | 'running';
export type ProgressCallback = (phase: RunPhase) => void;

const EXECUTION_TIMEOUT_MS = 15_000;
const CLANG_PACKAGE = 'clang/clang';

const BROWSER_GUARD_MESSAGE =
  "This browser can't run the C/C++ compiler. Try a current Chrome, Firefox, or Safari.";
const DOWNLOAD_FAILURE_MESSAGE =
  "Couldn't download the compiler. Check your connection and press Run to retry.";
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
