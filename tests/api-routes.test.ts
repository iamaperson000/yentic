import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import prisma from '../src/lib/prisma';
import * as collaborationRoute from '../src/app/api/projects/[id]/collaboration/route';
import * as usernameAvailabilityRoute from '../src/app/api/user/check-username/route';
import * as userByUsernameRoute from '../src/app/api/user/[username]/route';

const originalUserFindFirst = prisma.user.findFirst;

function createRequest(url: string, init?: RequestInit) {
  return new Request(url, init);
}

afterEach(() => {
  prisma.user.findFirst = originalUserFindFirst;
  delete process.env.DATABASE_URL;
});

test('user lookup route returns 503 when the database is not configured', async () => {
  let queried = false;
  prisma.user.findFirst = (async () => {
    queried = true;
    return null;
  }) as typeof prisma.user.findFirst;

  const response = await userByUsernameRoute.GET(
    createRequest('http://localhost/api/user/alice') as never,
    { params: Promise.resolve({ username: 'alice' }) },
  );

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'Database connection is not configured' });
  assert.equal(queried, false);
});

test('user lookup route rejects empty or malformed usernames after normalization', async () => {
  process.env.DATABASE_URL = 'postgres://test';

  const blankResponse = await userByUsernameRoute.GET(
    createRequest('http://localhost/api/user/%20%20') as never,
    { params: Promise.resolve({ username: '   ' }) },
  );
  assert.equal(blankResponse.status, 400);
  assert.deepEqual(await blankResponse.json(), { error: 'Username is required' });

  const malformedResponse = await userByUsernameRoute.GET(
    createRequest('http://localhost/api/user/bad') as never,
    { params: Promise.resolve({ username: '%E0%A4%A' }) },
  );
  assert.equal(malformedResponse.status, 400);
  assert.deepEqual(await malformedResponse.json(), { error: 'Username is required' });
});

test('user lookup route normalizes the username and returns matching users', async () => {
  process.env.DATABASE_URL = 'postgres://test';

  const lookups: unknown[] = [];
  prisma.user.findFirst = (async (args: unknown) => {
    lookups.push(args);
    return {
      id: 'user-1',
      name: 'Alice',
      username: 'alice smith',
      image: null,
      bio: 'Bio',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    };
  }) as typeof prisma.user.findFirst;

  const response = await userByUsernameRoute.GET(
    createRequest('http://localhost/api/user/Alice%20Smith') as never,
    { params: Promise.resolve({ username: ' Alice%20Smith ' }) },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(lookups[0], {
    where: {
      username: { equals: 'alice smith', mode: 'insensitive' },
    },
  });
  assert.deepEqual(await response.json(), {
    id: 'user-1',
    name: 'Alice',
    username: 'alice smith',
    image: null,
    bio: 'Bio',
    createdAt: '2024-01-01T00:00:00.000Z',
  });
});

test('user lookup route returns 404 when no matching user exists', async () => {
  process.env.DATABASE_URL = 'postgres://test';
  prisma.user.findFirst = (async () => null) as typeof prisma.user.findFirst;

  const response = await userByUsernameRoute.GET(
    createRequest('http://localhost/api/user/missing') as never,
    { params: Promise.resolve({ username: 'missing' }) },
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'User not found' });
});

test('username availability route rejects invalid usernames before touching the database', async () => {
  let queried = false;
  prisma.user.findFirst = (async () => {
    queried = true;
    return null;
  }) as typeof prisma.user.findFirst;

  const response = await usernameAvailabilityRoute.GET(
    createRequest('http://localhost/api/user/check-username?username=Nope!') as never,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    available: false,
    reason: 'Invalid username format',
  });
  assert.equal(queried, false);
});

test('username availability route returns a 503 when the database is not configured', async () => {
  const response = await usernameAvailabilityRoute.GET(
    createRequest('http://localhost/api/user/check-username?username=alice_123') as never,
  );

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    available: false,
    reason: 'Database connection is not configured',
  });
});

test('collaboration route returns a 410 response for deprecated POST calls', async () => {
  const response = await collaborationRoute.POST();

  assert.equal(response.status, 410);
  assert.deepEqual(await response.json(), {
    error: 'Collaboration events are no longer handled by this endpoint.',
  });
});
