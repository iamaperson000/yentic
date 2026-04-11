import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  filterProjectsByQuery,
  getMenuActionsForScope,
  type HomeProjectSummary,
} from '../src/lib/projects-home';

const sample: HomeProjectSummary[] = [
  {
    id: 'p1',
    name: 'Alpha Web',
    language: 'web',
    updatedAt: '2026-04-11T10:00:00.000Z',
    viewerRole: 'owner',
  },
  {
    id: 'p2',
    name: 'Shared Python Service',
    language: 'python',
    updatedAt: '2026-04-10T10:00:00.000Z',
    viewerRole: 'editor',
  },
];

test('filterProjectsByQuery returns all projects for blank query', () => {
  assert.deepEqual(filterProjectsByQuery(sample, ''), sample);
  assert.deepEqual(filterProjectsByQuery(sample, '   '), sample);
});

test('filterProjectsByQuery matches names case-insensitively', () => {
  assert.deepEqual(filterProjectsByQuery(sample, 'python').map(project => project.id), ['p2']);
  assert.deepEqual(filterProjectsByQuery(sample, 'ALPHA').map(project => project.id), ['p1']);
});

test('getMenuActionsForScope returns only open and rename for shared projects', () => {
  assert.deepEqual(getMenuActionsForScope('shared'), ['open', 'rename']);
});

test('getMenuActionsForScope returns full owned action set', () => {
  assert.deepEqual(getMenuActionsForScope('owned'), ['open', 'rename', 'delete', 'share']);
});
