import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileAndRun } from '../src/lib/wasmClang';

test('wasmClang requires a browser runtime in Node tests', async () => {
  await assert.rejects(
    () => compileAndRun('c', 'int main(){return 0;}', ''),
    /only available in the browser/
  );
});
