import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeUsername } from '../src/lib/username';

test('normalizeUsername trims, lowercases, and decodes usernames', () => {
  assert.equal(normalizeUsername('  Alice%20Smith  '), 'alice smith');
  assert.equal(normalizeUsername('Bob_Example'), 'bob_example');
});

test('normalizeUsername rejects blank, non-string, and malformed input', () => {
  assert.equal(normalizeUsername('   '), null);
  assert.equal(normalizeUsername(42), null);
  assert.equal(normalizeUsername('%E0%A4%A'), null);
});
