import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextTheme } from '../src/lib/theme';

test('nextTheme flips dusk -> daylight and back', () => {
  assert.equal(nextTheme('dusk'), 'daylight');
  assert.equal(nextTheme('daylight'), 'dusk');
});
