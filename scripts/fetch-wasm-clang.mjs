// Downloads the wasm-clang toolchain binaries (clang, lld, memfs, sysroot)
// into public/wasm-clang/ so the C/C++ runner worker can load them from a
// same-origin URL. Skips files that already exist and verify. ~58MB, one time.
// Source: https://github.com/binji/wasm-clang (Apache-2.0, Ben Smith / WABT
// author). SHA-256 pins protect against upstream tampering — if the pins
// mismatch, the build fails instead of shipping unknown binaries.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://binji.github.io/wasm-clang/';
// Pinned 2026-07-09.
const FILES = {
  clang: '2a466f0e990329d3230b869d04fc20803eae96a7feb3a3f6c93e25a77b8aed1d',
  lld: '36419ed202011765222098d7701218378b67f634d50f0a4625059ae2c9860f48',
  memfs: '2c72ee42bd9430029dda8c6bafc9f37143f6fe88d5f1ea950a70259ab748bcfe',
  'sysroot.tar': '2435a7b549af30c2be7ec249c405bc2e911ab0c6003012f0909ec3c131bff867',
};

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dest = join(root, 'public', 'wasm-clang');
mkdirSync(dest, { recursive: true });

const sha256 = buf => createHash('sha256').update(buf).digest('hex');

for (const [file, expected] of Object.entries(FILES)) {
  const target = join(dest, file);
  if (existsSync(target) && sha256(readFileSync(target)) === expected) continue;

  console.log(`fetching wasm-clang/${file}…`);
  const res = await fetch(BASE + file);
  if (!res.ok) throw new Error(`Failed to fetch ${file}: HTTP ${res.status}`);
  const body = Buffer.from(await res.arrayBuffer());

  const actual = sha256(body);
  if (actual !== expected) {
    if (existsSync(target)) unlinkSync(target);
    throw new Error(
      `Integrity check FAILED for ${file}:\n  expected ${expected}\n  got      ${actual}\n` +
      'Refusing to install. The upstream file changed — verify it manually before updating the pin.'
    );
  }
  writeFileSync(target, body);
}
console.log('wasm-clang toolchain ready in public/wasm-clang (checksums verified)');
