// Downloads the wasm-clang toolchain binaries (clang, lld, memfs, sysroot)
// into public/wasm-clang/ so the C/C++ runner worker can load them from a
// same-origin URL. Skips files that already exist. ~58MB total, one time.
// Source: https://github.com/binji/wasm-clang (Apache-2.0).
import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const BASE = 'https://binji.github.io/wasm-clang/';
const FILES = ['clang', 'lld', 'memfs', 'sysroot.tar'];

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dest = join(root, 'public', 'wasm-clang');
mkdirSync(dest, { recursive: true });

for (const file of FILES) {
  const target = join(dest, file);
  if (existsSync(target) && statSync(target).size > 0) continue;
  console.log(`fetching wasm-clang/${file}…`);
  const res = await fetch(BASE + file);
  if (!res.ok) throw new Error(`Failed to fetch ${file}: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(target));
}
console.log('wasm-clang toolchain ready in public/wasm-clang');
