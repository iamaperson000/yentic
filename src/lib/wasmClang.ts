import type { RunResult } from './runners';

export type RunPhase = 'downloading' | 'compiling' | 'running';
export type ProgressCallback = (phase: RunPhase) => void;

// Compile + link + run happen inside a worker we own, so a timeout is a real
// kill (worker.terminate), not an abandoned promise. First run fetches the
// ~60MB toolchain; the budget covers that download.
const FIRST_RUN_TIMEOUT_MS = 300_000;
const EXECUTION_TIMEOUT_MS = 30_000;
const WORKER_URL = '/wasm-clang/worker.js';

const TIMEOUT_MESSAGE = 'Program took too long (30s limit) and was stopped.';

type WorkerReply =
  | { id: number; phase: RunPhase }
  | { id: number; done: RunResult }
  | { id: number; error: string };

let worker: Worker | null = null;
let toolchainWarm = false;
let nextJobId = 1;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(WORKER_URL);
  }
  return worker;
}

function killWorker(): void {
  worker?.terminate();
  worker = null;
  toolchainWarm = false;
}

export async function compileAndRun(
  language: 'c' | 'cpp',
  source: string,
  stdin: string,
  onProgress?: ProgressCallback
): Promise<RunResult> {
  if (typeof window === 'undefined') {
    throw new Error('The C/C++ compiler is only available in the browser.');
  }
  if (typeof WebAssembly === 'undefined') {
    throw new Error("This browser can't run the C/C++ compiler. Try a current Chrome, Firefox, or Safari.");
  }

  const id = nextJobId++;
  const w = getWorker();
  const timeoutMs = toolchainWarm ? EXECUTION_TIMEOUT_MS : FIRST_RUN_TIMEOUT_MS;

  return new Promise<RunResult>(resolve => {
    const timer = setTimeout(() => {
      // Terminating the worker drops the warm module cache, but it's the only
      // way to actually stop a runaway program.
      killWorker();
      cleanup();
      resolve({ stdout: '', stderr: TIMEOUT_MESSAGE });
    }, timeoutMs);

    const handleMessage = (event: MessageEvent<WorkerReply>) => {
      const reply = event.data;
      if (reply.id !== id) return;
      if ('phase' in reply) {
        onProgress?.(reply.phase);
        return;
      }
      cleanup();
      if ('error' in reply) {
        resolve({ stdout: '', stderr: reply.error });
        return;
      }
      toolchainWarm = true;
      resolve(reply.done);
    };

    const handleError = (event: ErrorEvent) => {
      killWorker();
      cleanup();
      resolve({
        stdout: '',
        stderr: `Couldn't load the compiler. Check your connection and press Run to retry. (${event.message})`,
      });
    };

    const cleanup = () => {
      clearTimeout(timer);
      w.removeEventListener('message', handleMessage);
      w.removeEventListener('error', handleError);
    };

    w.addEventListener('message', handleMessage);
    w.addEventListener('error', handleError);
    onProgress?.(toolchainWarm ? 'compiling' : 'downloading');
    w.postMessage({ id, language, source, stdin });
  });
}
