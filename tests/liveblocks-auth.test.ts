import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveRoomAccess, type RoomAccessInput, type RoomAccessResult } from '../src/lib/liveblocks-auth';

type FakeProject = { id: string; userId: string; collaborators: { userId: string; role: string }[] } | null;

function input(overrides: Partial<RoomAccessInput> & { project: FakeProject }): RoomAccessInput {
  return {
    userId: 'user-1',
    room: 'project-abc',
    loadProject: async () => overrides.project,
    ...overrides,
  };
}

test('resolveRoomAccess denies anonymous users', async () => {
  const result = await resolveRoomAccess({
    userId: null,
    room: 'project-abc',
    loadProject: async () => {
      throw new Error('should not be called for unauthenticated user');
    },
  });
  assert.deepEqual(result, { kind: 'unauthorized' } satisfies RoomAccessResult);
});

test('resolveRoomAccess rejects malformed room names', async () => {
  const result = await resolveRoomAccess(input({ project: null, room: 'not-a-project-room' }));
  assert.deepEqual(result, { kind: 'bad-room' });
});

test('resolveRoomAccess returns not-found when the project does not exist', async () => {
  const result = await resolveRoomAccess(input({ project: null }));
  assert.deepEqual(result, { kind: 'not-found' });
});

test('resolveRoomAccess grants full access to the project owner', async () => {
  const result = await resolveRoomAccess(
    input({
      project: { id: 'abc', userId: 'user-1', collaborators: [] },
    }),
  );
  assert.deepEqual(result, { kind: 'allow', access: 'full', projectId: 'abc' });
});

test('resolveRoomAccess grants full access to editor collaborators', async () => {
  const result = await resolveRoomAccess(
    input({
      project: { id: 'abc', userId: 'owner-1', collaborators: [{ userId: 'user-1', role: 'editor' }] },
    }),
  );
  assert.deepEqual(result, { kind: 'allow', access: 'full', projectId: 'abc' });
});

test('resolveRoomAccess grants read-only access to viewer collaborators', async () => {
  const result = await resolveRoomAccess(
    input({
      project: { id: 'abc', userId: 'owner-1', collaborators: [{ userId: 'user-1', role: 'viewer' }] },
    }),
  );
  assert.deepEqual(result, { kind: 'allow', access: 'read', projectId: 'abc' });
});

test('resolveRoomAccess denies non-collaborators', async () => {
  const result = await resolveRoomAccess(
    input({
      project: { id: 'abc', userId: 'owner-1', collaborators: [{ userId: 'someone-else', role: 'editor' }] },
    }),
  );
  assert.deepEqual(result, { kind: 'forbidden' });
});
