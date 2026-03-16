import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, test } from 'node:test';

import type { Prisma } from '@prisma/client';

import prisma from '../src/lib/prisma';
import {
  createProjectShareLink,
  inviteProjectCollaborator,
  listProjectCollaborators,
  ProjectCollaborationError,
  removeProjectCollaborator,
} from '../src/lib/project-collaboration';

const dbEnabled = Boolean(process.env.DATABASE_URL);

const starterFiles = {
  'main.c': {
    path: 'main.c',
    language: 'c',
    code: 'int main(void) { return 0; }\n',
  },
} as Prisma.JsonObject;

let sequence = 0;

function unique(prefix: string) {
  sequence += 1;
  return `${prefix}-${sequence}-${randomUUID().slice(0, 8)}`;
}

async function resetDatabase() {
  await prisma.collaborator.deleteMany();
  await prisma.project.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.verificationToken.deleteMany();
}

async function createUser(overrides: {
  email?: string;
  name?: string;
  username?: string | null;
} = {}) {
  const handle = unique('user').replace(/-/g, '_').toLowerCase();

  return prisma.user.create({
    data: {
      email: overrides.email ?? `${handle}@example.com`,
      name: overrides.name ?? `User ${sequence}`,
      username: overrides.username === undefined ? handle : overrides.username,
    },
  });
}

async function createProject(
  owner: { id: string },
  overrides: {
    name?: string;
    language?: string;
    shareToken?: string | null;
    collaborationKey?: string;
  } = {},
) {
  return prisma.project.create({
    data: {
      name: overrides.name ?? unique('project'),
      language: overrides.language ?? 'c',
      files: starterFiles,
      shareToken: overrides.shareToken === undefined ? unique('share') : overrides.shareToken,
      collaborationKey: overrides.collaborationKey ?? unique('collab'),
      user: {
        connect: { id: owner.id },
      },
    },
  });
}

async function addCollaborator(
  projectId: string,
  userId: string,
  role: 'editor' | 'viewer' = 'viewer',
) {
  return prisma.collaborator.create({
    data: {
      projectId,
      userId,
      role,
    },
  });
}

async function expectCollaborationError(
  action: () => Promise<unknown>,
  status: number,
  message: string,
) {
  await assert.rejects(action, error => {
    assert.ok(error instanceof ProjectCollaborationError);
    assert.equal(error.status, status);
    assert.equal(error.message, message);
    return true;
  });
}

beforeEach(async () => {
  if (!dbEnabled) {
    return;
  }

  await resetDatabase();
});

afterEach(async () => {
  if (!dbEnabled) {
    return;
  }

  await resetDatabase();
});

test(
  'createProjectShareLink generates, reuses, and rotates project invite tokens',
  { skip: !dbEnabled },
  async () => {
    const owner = await createUser();
    const project = await createProject(owner, { shareToken: null });

    const created = await createProjectShareLink(project.id, owner.email);
    assert.match(created.token, /^[a-f0-9]{48}$/);
    assert.equal(created.url, `/project/${project.id}?invite=${created.token}`);

    const storedAfterCreate = await prisma.project.findUnique({
      where: { id: project.id },
      select: { shareToken: true },
    });
    assert.equal(storedAfterCreate?.shareToken, created.token);

    const reused = await createProjectShareLink(project.id, owner.email);
    assert.equal(reused.token, created.token);

    const rotated = await createProjectShareLink(project.id, owner.email, {
      rotate: true,
    });
    assert.notEqual(rotated.token, created.token);
    assert.equal(rotated.url, `/project/${project.id}?invite=${rotated.token}`);
  },
);

test(
  'createProjectShareLink rejects missing projects and non-owner access',
  { skip: !dbEnabled },
  async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const project = await createProject(owner);

    await expectCollaborationError(
      () => createProjectShareLink('missing-project', owner.email),
      404,
      'Not found',
    );
    await expectCollaborationError(
      () => createProjectShareLink(project.id, stranger.email),
      403,
      'Forbidden',
    );
  },
);

test(
  'inviteProjectCollaborator creates editor access from an email lookup',
  { skip: !dbEnabled },
  async () => {
    const owner = await createUser();
    const invitee = await createUser({ username: 'collab_target' });
    const project = await createProject(owner);

    const result = await inviteProjectCollaborator(project.id, owner.email, invitee.email);

    assert.deepEqual(result, {
      collaborator: {
        id: invitee.id,
        name: invitee.name,
        username: invitee.username,
        image: invitee.image,
        role: 'editor',
      },
    });

    const stored = await prisma.collaborator.findFirst({
      where: {
        projectId: project.id,
        userId: invitee.id,
      },
      select: { role: true },
    });
    assert.equal(stored?.role, 'editor');
  },
);

test(
  'inviteProjectCollaborator upgrades viewers to editors and stays idempotent',
  { skip: !dbEnabled },
  async () => {
    const owner = await createUser();
    const viewer = await createUser({ username: 'existing_viewer' });
    const project = await createProject(owner);

    await addCollaborator(project.id, viewer.id, 'viewer');

    const upgraded = await inviteProjectCollaborator(project.id, owner.email, 'existing_viewer');
    assert.equal(upgraded.collaborator.role, 'editor');

    const secondPass = await inviteProjectCollaborator(project.id, owner.email, 'existing_viewer');
    assert.equal(secondPass.collaborator.role, 'editor');

    const memberships = await prisma.collaborator.findMany({
      where: {
        projectId: project.id,
        userId: viewer.id,
      },
      select: { role: true },
    });
    assert.deepEqual(memberships, [{ role: 'editor' }]);
  },
);

test(
  'inviteProjectCollaborator rejects self-invites, missing users, and non-owner actors',
  { skip: !dbEnabled },
  async () => {
    const owner = await createUser({ username: 'owner_user' });
    const outsider = await createUser({ username: 'outside_user' });
    const project = await createProject(owner);

    await expectCollaborationError(
      () => inviteProjectCollaborator(project.id, owner.email, 'missing_user'),
      404,
      'User not found',
    );
    await expectCollaborationError(
      () => inviteProjectCollaborator(project.id, owner.email, 'owner_user'),
      400,
      'You are already the owner',
    );
    await expectCollaborationError(
      () => inviteProjectCollaborator(project.id, outsider.email, owner.email),
      403,
      'Forbidden',
    );
  },
);

test(
  'listProjectCollaborators returns the owner and collaborator roster for project members',
  { skip: !dbEnabled },
  async () => {
    const owner = await createUser({ username: 'owner_list' });
    const editor = await createUser({ username: 'editor_list' });
    const viewer = await createUser({ username: 'viewer_list' });
    const outsider = await createUser({ username: 'outsider_list' });
    const project = await createProject(owner);

    await addCollaborator(project.id, editor.id, 'editor');
    await addCollaborator(project.id, viewer.id, 'viewer');

    const payload = await listProjectCollaborators(project.id, viewer.email);

    assert.deepEqual(payload.owner, {
      id: owner.id,
      name: owner.name,
      username: owner.username,
      image: owner.image,
      role: 'owner',
    });
    assert.deepEqual(payload.collaborators, [
      {
        id: editor.id,
        name: editor.name,
        username: editor.username,
        image: editor.image,
        role: 'editor',
      },
      {
        id: viewer.id,
        name: viewer.name,
        username: viewer.username,
        image: viewer.image,
        role: 'viewer',
      },
    ]);

    await expectCollaborationError(
      () => listProjectCollaborators(project.id, outsider.email),
      404,
      'Not found',
    );
  },
);

test(
  'removeProjectCollaborator deletes access and rotates collaboration secrets',
  { skip: !dbEnabled },
  async () => {
    const owner = await createUser();
    const editor = await createUser({ username: 'editor_remove' });
    const project = await createProject(owner, {
      shareToken: 'share-token-before',
      collaborationKey: 'collab-key-before',
    });

    await addCollaborator(project.id, editor.id, 'editor');

    const payload = await removeProjectCollaborator(project.id, owner.email, editor.id);

    assert.equal(payload.ok, true);
    assert.notEqual(payload.shareToken, 'share-token-before');
    assert.notEqual(payload.collaborationKey, 'collab-key-before');
    assert.equal(payload.shareUrl, `/project/${project.id}?invite=${payload.shareToken}`);

    const membership = await prisma.collaborator.findFirst({
      where: {
        projectId: project.id,
        userId: editor.id,
      },
    });
    assert.equal(membership, null);

    const updatedProject = await prisma.project.findUnique({
      where: { id: project.id },
      select: { shareToken: true, collaborationKey: true },
    });
    assert.equal(updatedProject?.shareToken, payload.shareToken);
    assert.equal(updatedProject?.collaborationKey, payload.collaborationKey);
  },
);

test(
  'removeProjectCollaborator rejects owner removal and non-owner actors',
  { skip: !dbEnabled },
  async () => {
    const owner = await createUser({ username: 'owner_remove' });
    const editor = await createUser({ username: 'editor_remove_again' });
    const project = await createProject(owner);

    await addCollaborator(project.id, editor.id, 'editor');

    await expectCollaborationError(
      () => removeProjectCollaborator(project.id, owner.email, owner.id),
      400,
      'Cannot remove the project owner',
    );
    await expectCollaborationError(
      () => removeProjectCollaborator(project.id, editor.email, owner.id),
      403,
      'Forbidden',
    );
  },
);
