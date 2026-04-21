import assert from 'node:assert/strict';
import test from 'node:test';

import { parseProjectRoomId, projectRoomId } from '../src/lib/room-id';

test('projectRoomId formats the room name with the project prefix', () => {
  assert.equal(projectRoomId('abc-123'), 'project-abc-123');
});

test('parseProjectRoomId extracts the id from a well-formed room name', () => {
  assert.deepEqual(parseProjectRoomId('project-abc-123'), { projectId: 'abc-123' });
});

test('parseProjectRoomId returns null for rooms missing the prefix', () => {
  assert.equal(parseProjectRoomId('abc-123'), null);
  assert.equal(parseProjectRoomId(''), null);
  assert.equal(parseProjectRoomId('projekt-abc'), null);
});

test('parseProjectRoomId returns null when the id part is empty', () => {
  assert.equal(parseProjectRoomId('project-'), null);
});

test('parseProjectRoomId trims whitespace-only input', () => {
  assert.equal(parseProjectRoomId('   '), null);
});
