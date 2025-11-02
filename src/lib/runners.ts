import type { SupportedLanguage } from './project';

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';

export type ExecutableLanguage = Extract<SupportedLanguage, 'python' | 'c' | 'cpp' | 'java'>;

export type RunResult = {
  stdout: string;
  stderr: string;
};

const supportedLanguages: ReadonlySet<ExecutableLanguage> = new Set(['python', 'c', 'cpp', 'java']);

type PyodideStdIO = {
  batched: (text: string) => void;
};

type Pyodide = {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (callbacks: PyodideStdIO) => (() => void) | void;
  setStderr: (callbacks: PyodideStdIO) => (() => void) | void;
};

declare global {
  interface Window {
    loadPyodide?: (options?: { indexURL?: string }) => Promise<Pyodide>;
  }
}

const scriptCache = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Script loading is only available in the browser.'));
  }
  if (scriptCache.has(src)) {
    return scriptCache.get(src)!;
  }
  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-runtime="${src}"]`);
    if (existing?.dataset.loaded === 'true') {
      resolve();
      return;
    }
    const script = existing ?? document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.runtime = src;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => {
      script.remove();
      reject(new Error(`Failed to load runtime from ${src}`));
    };
    if (!existing) {
      document.head.appendChild(script);
    }
  });
  scriptCache.set(src, promise);
  return promise;
}

let pyodideInstance: Pyodide | null = null;
let pyodideLoading: Promise<Pyodide> | null = null;

async function ensurePyodide(): Promise<Pyodide> {
  if (pyodideInstance) {
    return pyodideInstance;
  }
  if (pyodideLoading) {
    return pyodideLoading;
  }
  if (typeof window === 'undefined') {
    throw new Error('Python runtime is only available in the browser.');
  }
  pyodideLoading = (async () => {
    await loadScript(PYODIDE_URL);
    if (!window.loadPyodide) {
      throw new Error('Pyodide failed to load.');
    }
    const instance = await window.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/' });
    pyodideInstance = instance;
    return instance;
  })();
  try {
    return await pyodideLoading;
  } finally {
    pyodideLoading = null;
  }
}

function formatCPrintf(template: unknown, args: unknown[]): string {
  if (typeof template !== 'string') {
    return [template, ...args].filter(Boolean).map(value => String(value ?? '')).join(' ');
  }
  let index = 0;
  const formatted = template.replace(/%[0-9]*\.?[0-9]*[dfs]/g, token => {
    const value = args[index++];
    switch (token[token.length - 1]) {
      case 'd':
        return Number(value ?? 0).toString();
      case 'f':
        return Number(value ?? 0).toString();
      case 's':
        return String(value ?? '');
      default:
        return token;
    }
  });
  const remaining = args.slice(index).map(value => String(value ?? ''));
  return remaining.length ? `${formatted} ${remaining.join(' ')}` : formatted;
}

function transpileCToJavaScript(source: string): string {
  let code = source;
  code = code.replace(/#include[^\n]*\n/g, '\n');
  code = code.replace(/\btypedef\b[^;]*;/g, '');
  code = code.replace(/\bunsigned\s+/g, '');
  code = code.replace(/\bconst\s+(?=(int|float|double|long|short|char|bool)\b)/g, 'const ');
  code = code.replace(/\b(int|float|double|long|short|char|bool)\s+\*/g, 'let ');
  code = code.replace(/\b(void|int|float|double|long|short|char|bool)\s+([A-Za-z_][\w]*)\s*\(([^)]*)\)/g, (_match, _type, name, params) => {
    if (name === 'main') {
      return `function main(${params})`;
    }
    const updatedParams = params.replace(/\b(int|float|double|long|short|char|bool)\s+/g, '');
    return `function ${name}(${updatedParams})`;
  });
  code = code.replace(/\b(int|float|double|long|short|char|bool)\s+([A-Za-z_][\w]*)/g, 'let $2');
  code = code.replace(/for\s*\(\s*int\s+/g, 'for (let ');
  code = code.replace(/printf\s*\(([^)]*)\)\s*;/g, '__printC($1);');
  code = code.replace(/puts\s*\(([^)]*)\)\s*;/g, "__printC($1, '\\n');");
  code = code.replace(/putchar\s*\(([^)]*)\)\s*;/g, '__printChar($1);');
  return code;
}

function executeC(source: string): RunResult {
  const runtimeSource = [
    `'use strict';`,
    'const __output = [];',
    `const formatC = ${formatCPrintf.toString()};`,
    'const __printC = (...args) => {',
    '  const [first, ...rest] = args;',
    '  const text = formatC(first, rest);',
    '  __output.push(text);',
    '};',
    'const __printChar = value => {',
    "  const character = typeof value === 'number' ? String.fromCharCode(value) : String(value ?? '');",
    '  __output.push(character);',
    '};',
    transpileCToJavaScript(source),
    "if (typeof main === 'function') {",
    '  const exitCode = main();',
    "  if (typeof exitCode === 'number' && exitCode !== 0) {",
    "    __printC('Program exited with code %d\\n', exitCode);",
    '  }',
    '}',
    "return __output.join('');"
  ].join('\n');

  const runtime = new Function(runtimeSource);

  try {
    const stdout = runtime();
    return { stdout, stderr: '' };
  } catch (error) {
    return { stdout: '', stderr: error instanceof Error ? error.message : String(error) };
  }
}

function splitCppStream(body: string): string[] {
  return body
    .split(/<</)
    .map(segment => segment.trim())
    .filter(Boolean);
}

function convertCppStream(body: string, target: '__cout' | '__cerr'): string {
  const segments = splitCppStream(body);
  if (!segments.length) {
    return `${target}();`;
  }
  const args = segments.map(segment => {
    if (segment === '__ENDL' || segment === 'std::endl' || segment === 'endl') {
      return '__ENDL';
    }
    return segment.replace(/^std::/, '');
  });
  return `${target}(${args.join(', ')});`;
}

function transpileCppToJavaScript(source: string): string {
  let code = source;
  code = code.replace(/#include[^\n]*\n/g, '\n');
  code = code.replace(/using\s+namespace\s+std\s*;?/g, '');
  code = code.replace(/\bconstexpr\s+/g, '');
  code = code.replace(/\bstd::endl\b/g, '__ENDL');
  code = code.replace(/std::cout\s*<<([^;]+);/g, (_match, body) => convertCppStream(body, '__cout'));
  code = code.replace(/std::cerr\s*<<([^;]+);/g, (_match, body) => convertCppStream(body, '__cerr'));
  code = code.replace(/\bcout\s*<<([^;]+);/g, (_match, body) => convertCppStream(body, '__cout'));
  code = code.replace(/\bcerr\s*<<([^;]+);/g, (_match, body) => convertCppStream(body, '__cerr'));
  code = code.replace(/\bstd::string\b/g, 'string');
  code = code.replace(/\bstd::/g, '');
  code = transpileCToJavaScript(code);
  code = code.replace(/\bstring\s+([A-Za-z_][\w]*)/g, 'let $1');
  code = code.replace(/\bvector<[^>]+>\s+([A-Za-z_][\w]*)/g, 'let $1');
  code = code.replace(/\barray<[^>]+>\s+([A-Za-z_][\w]*)/g, 'let $1');
  code = code.replace(/\bmap<[^>]+>\s+([A-Za-z_][\w]*)/g, 'let $1');
  code = code.replace(/\bset<[^>]+>\s+([A-Za-z_][\w]*)/g, 'let $1');
  code = code.replace(/for\s*\(\s*(?:size_t|long\s+long)\s+/g, 'for (let ');
  return code;
}

function executeCpp(source: string): RunResult {
  let transformed: string;
  try {
    transformed = transpileCppToJavaScript(source);
  } catch (error) {
    return { stdout: '', stderr: error instanceof Error ? error.message : String(error) };
  }

  const runtimeSource = [
    `'use strict';`,
    'const __output = [];',
    'const __stderr = [];',
    `const formatC = ${formatCPrintf.toString()};`,
    'const __printC = (...args) => {',
    '  const [first, ...rest] = args;',
    '  const text = formatC(first, rest);',
    '  __output.push(text);',
    '};',
    'const __printChar = value => {',
    "  const character = typeof value === 'number' ? String.fromCharCode(value) : String(value ?? '');",
    '  __output.push(character);',
    '};',
    'const __ENDL = Symbol.for("cpp.endl");',
    'const __cout = (...args) => {',
    '  args.forEach(arg => {',
    '    if (arg === __ENDL) {',
    "      __output.push('\n');",
    '      return;',
    '    }',
    "    __output.push(String(arg ?? ''));",
    '  });',
    '};',
    'const __cerr = (...args) => {',
    '  args.forEach(arg => {',
    '    if (arg === __ENDL) {',
    "      __stderr.push('\n');",
    '      return;',
    '    }',
    "    __stderr.push(String(arg ?? ''));",
    '  });',
    '};',
    transformed,
    "if (typeof main === 'function') {",
    '  const exitCode = main();',
    "  if (typeof exitCode === 'number' && exitCode !== 0) {",
    "    __stderr.push(`Program exited with code ${exitCode}`);",
    '  }',
    '}',
    'const __result = { stdout: __output.join(""), stderr: __stderr.join("") };',
    'return __result;'
  ].join('\n');

  const runtime = new Function(runtimeSource);

  try {
    const outcome = runtime() as unknown;
    if (
      outcome &&
      typeof outcome === 'object' &&
      'stdout' in (outcome as Record<string, unknown>) &&
      'stderr' in (outcome as Record<string, unknown>)
    ) {
      const { stdout, stderr } = outcome as { stdout: string; stderr: string };
      return { stdout, stderr };
    }
    return { stdout: '', stderr: '' };
  } catch (error) {
    return { stdout: '', stderr: error instanceof Error ? error.message : String(error) };
  }
}

function extractJavaMainBody(source: string): string {
  const mainPattern = /public\s+static\s+void\s+main\s*\(\s*String\s*\[\s*]\s*\w*\s*\)\s*\{/;
  const match = mainPattern.exec(source);
  if (!match) {
    throw new Error('Could not find a main method to execute.');
  }
  const start = match.index + match[0].length;
  let depth = 1;
  let index = start;
  while (index < source.length && depth > 0) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    index += 1;
  }
  if (depth !== 0) {
    throw new Error('Unbalanced braces in Java source.');
  }
  return source.slice(start, index - 1);
}

function transpileJavaToJavaScript(source: string): string {
  const body = extractJavaMainBody(source);
  let code = body;
  code = code.replace(/System\.out\.println\s*\(([^)]*)\)\s*;/g, '__println($1);');
  code = code.replace(/System\.out\.print\s*\(([^)]*)\)\s*;/g, '__print($1);');
  code = code.replace(/System\.out\.printf\s*\(([^)]*)\)\s*;/g, '__printf($1);');
  code = code.replace(/\bString\s+([A-Za-z_][\w]*)/g, 'let $1');
  code = code.replace(/\b(int|double|float|long|short|boolean|char)\s+([A-Za-z_][\w]*)/g, 'let $2');
  code = code.replace(/for\s*\(\s*int\s+/g, 'for (let ');
  return code;
}

function executeJava(source: string): RunResult {
  let jsBody: string;
  try {
    jsBody = transpileJavaToJavaScript(source);
  } catch (error) {
    return { stdout: '', stderr: error instanceof Error ? error.message : String(error) };
  }

  const runtimeSource = [
    `'use strict';`,
    'const __output = [];',
    `const formatC = ${formatCPrintf.toString()};`,
    "const __print = value => { __output.push(String(value ?? '')); };",
    "const __println = value => { __output.push(String(value ?? '') + '\\n'); };",
    'const __printf = (...args) => {',
    '  const [first, ...rest] = args;',
    '  __output.push(formatC(first, rest));',
    '};',
    'const print = __print;',
    'const println = __println;',
    'const printf = __printf;',
    'const Math = globalThis.Math;',
    'const Arrays = globalThis.Array;',
    'const System = { out: { print: __print, println: __println, printf: __printf } };',
    `const Main = { main: () => { ${jsBody} } };`,
    'Main.main();',
    "return __output.join('');"
  ].join('\n');

  const runtime = new Function(runtimeSource);

  try {
    const stdout = runtime();
    return { stdout, stderr: '' };
  } catch (error) {
    return { stdout: '', stderr: error instanceof Error ? error.message : String(error) };
  }
}

function normalizePythonError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message ?? '';
    if (message) {
      const lines = message.split('\n')
        .map((line) => line.trimEnd())
        .filter((line) => line.trim().length > 0);
      if (lines.length > 0) {
        return lines[lines.length - 1];
      }
      return message.trim();
    }
    return error.toString();
  }
  if (typeof error === 'string') {
    const lines = error.split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => line.trim().length > 0);
    if (lines.length > 0) {
      return lines[lines.length - 1];
    }
    return error.trim();
  }
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

async function executePython(source: string): Promise<RunResult> {
  const pyodide = await ensurePyodide();
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const restoreStdout = pyodide.setStdout({
    batched: (text: string) => {
      stdoutChunks.push(text);
    }
  });
  const restoreStderr = pyodide.setStderr({
    batched: (text: string) => {
      stderrChunks.push(text);
    }
  });
  try {
    const result = await pyodide.runPythonAsync(source);
    if (typeof result === 'string' && result) {
      stdoutChunks.push(result);
    } else if (result !== undefined && result !== null) {
      stdoutChunks.push(String(result));
    }
    return { stdout: stdoutChunks.join(''), stderr: stderrChunks.join('') };
  } catch (error) {
    const normalized = normalizePythonError(error);
    const stderr = stderrChunks.join('');
    const message = stderr ? `${stderr}${stderr.endsWith('\n') ? '' : '\n'}${normalized}` : normalized;
    return { stdout: stdoutChunks.join(''), stderr: message };
  } finally {
    if (restoreStdout) restoreStdout();
    if (restoreStderr) restoreStderr();
  }
}

export async function executeCode(language: ExecutableLanguage, source: string): Promise<RunResult> {
  if (!supportedLanguages.has(language)) {
    throw new Error(`Unsupported language: ${language}`);
  }
  if (language === 'python') {
    return executePython(source);
  }
  if (language === 'c') {
    return executeC(source);
  }
  if (language === 'cpp') {
    return executeCpp(source);
  }
  if (language === 'java') {
    return executeJava(source);
  }
  throw new Error(`Unsupported language: ${language}`);
}
