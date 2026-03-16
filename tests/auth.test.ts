import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { authOptions } from '../src/lib/auth';
import prisma from '../src/lib/prisma';

const originalFindUnique = prisma.user.findUnique;

afterEach(() => {
  prisma.user.findUnique = originalFindUnique;
});

test('jwt callback stores signed-in user fields on the token', async () => {
  const jwt = authOptions.callbacks?.jwt;
  assert.ok(jwt);

  const token = await jwt({
    token: {},
    user: {
      id: 'user-1',
      email: 'alice@example.com',
      username: 'alice',
      bio: 'Hello there',
      image: 'https://example.com/alice.png',
      name: 'Alice',
    } as never,
    trigger: 'signIn',
    session: null,
  } as never);

  assert.equal(token.id, 'user-1');
  assert.equal(token.username, 'alice');
  assert.equal(token.bio, 'Hello there');
  assert.equal(token.picture, 'https://example.com/alice.png');
  assert.equal(token.name, 'Alice');
  assert.equal(token.email, 'alice@example.com');
});

test('jwt callback refreshes token data from the database during session updates', async () => {
  const jwt = authOptions.callbacks?.jwt;
  assert.ok(jwt);

  const lookups: unknown[] = [];
  prisma.user.findUnique = (async (args: unknown) => {
    lookups.push(args);
    return {
      id: 'user-2',
      email: 'fresh@example.com',
      username: 'fresh_name',
      bio: 'Fresh bio',
      image: 'https://example.com/fresh.png',
      name: 'Fresh Name',
    };
  }) as typeof prisma.user.findUnique;

  const token = await jwt({
    token: {
      id: 'user-2',
      email: 'stale@example.com',
      picture: 'https://example.com/stale.png',
      name: 'Stale Name',
    },
    trigger: 'update',
    session: {},
  } as never);

  assert.equal(lookups.length, 1);
  assert.deepEqual(lookups[0], {
    where: { id: 'user-2' },
    select: {
      id: true,
      email: true,
      username: true,
      bio: true,
      image: true,
      name: true,
    },
  });
  assert.equal(token.id, 'user-2');
  assert.equal(token.sub, 'user-2');
  assert.equal(token.email, 'fresh@example.com');
  assert.equal(token.username, 'fresh_name');
  assert.equal(token.bio, 'Fresh bio');
  assert.equal(token.picture, 'https://example.com/fresh.png');
  assert.equal(token.name, 'Fresh Name');
});

test('jwt callback backfills username and profile data using the token email when needed', async () => {
  const jwt = authOptions.callbacks?.jwt;
  assert.ok(jwt);

  const lookups: unknown[] = [];
  prisma.user.findUnique = (async (args: unknown) => {
    lookups.push(args);
    return {
      id: 'user-3',
      email: 'lookup@example.com',
      username: 'lookup_user',
      bio: null,
      image: null,
      name: 'Lookup User',
    };
  }) as typeof prisma.user.findUnique;

  const token = await jwt({
    token: {
      email: 'lookup@example.com',
      picture: 'https://example.com/original.png',
    },
  } as never);

  assert.equal(lookups.length, 1);
  assert.deepEqual(lookups[0], {
    where: { email: 'lookup@example.com' },
    select: {
      id: true,
      email: true,
      username: true,
      bio: true,
      image: true,
      name: true,
    },
  });
  assert.equal(token.id, 'user-3');
  assert.equal(token.sub, 'user-3');
  assert.equal(token.username, 'lookup_user');
  assert.equal(token.name, 'Lookup User');
  assert.equal(token.picture, 'https://example.com/original.png');
});

test('session callback enriches the session user from the JWT token', async () => {
  const session = authOptions.callbacks?.session;
  assert.ok(session);

  const result = await session({
    session: { user: { email: 'user@example.com' } },
    token: {
      sub: 'user-4',
      username: 'session_user',
      bio: 'Session bio',
      picture: 'https://example.com/session.png',
      name: 'Session Name',
    },
  } as never);

  assert.deepEqual(result.user, {
    id: 'user-4',
    email: 'user@example.com',
    username: 'session_user',
    bio: 'Session bio',
    image: 'https://example.com/session.png',
    name: 'Session Name',
  });
});

test('signIn callback only allows users with an email address', async () => {
  const signIn = authOptions.callbacks?.signIn;
  assert.ok(signIn);

  assert.equal(await signIn({ user: { email: 'user@example.com' } } as never), true);
  assert.equal(await signIn({ user: { email: null } } as never), false);
});
