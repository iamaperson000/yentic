import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeCode } from '../src/lib/runners';

test('C runner handles empty parameter main signature', async () => {
  const source = `#include <stdio.h>\nint main() {\n  printf("hello\\n");\n  return 0;\n}`;
  const result = await executeCode('c', source);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, 'hello\n');
});

test('C runner handles void parameter main signature', async () => {
  const source = `#include <stdio.h>\nint main(void) {\n  printf("world\\n");\n  return 0;\n}`;
  const result = await executeCode('c', source);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, 'world\n');
});

test('C runner normalizes void parameters in helper functions', async () => {
  const source = `int helper(void) { return 0; }\nint main(void) { return helper(); }`;
  const result = await executeCode('c', source);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, '');
});

test('C runner accepts stdin for scanf usage', async () => {
  const source = `#include <stdio.h>\nint main(void) { int n; scanf("%d", &n); printf("%d\\n", n * 2); return 0; }`;
  const result = await executeCode('c', source, '7\n');
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, '14\n');
});
