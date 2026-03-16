import { randomBytes } from 'crypto';

import prisma from '@/lib/prisma';
import type { CollaboratorInfo, ViewerRole } from '@/types/collaboration';

type BasicUser = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
};

type CollaboratorRecord = {
  role: string;
  user: BasicUser;
};

export class ProjectCollaborationError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ProjectCollaborationError';
    this.status = status;
  }
}

function fail(status: number, message: string): never {
  throw new ProjectCollaborationError(status, message);
}

function toViewerRole(role: string): ViewerRole {
  if (role === 'owner') return 'owner';
  if (role === 'viewer') return 'viewer';
  return 'editor';
}

function serializeCollaborator(entry: CollaboratorRecord): { collaborator: CollaboratorInfo } {
  return {
    collaborator: {
      id: entry.user.id,
      name: entry.user.name,
      username: entry.user.username,
      image: entry.user.image,
      role: toViewerRole(entry.role),
    },
  };
}

async function requireUserByEmail(email: string): Promise<BasicUser> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
    },
  });

  if (!user) {
    fail(401, 'Unauthorized');
  }

  return user;
}

export async function createProjectShareLink(
  projectId: string,
  actorEmail: string,
  options: { rotate?: boolean } = {},
) {
  const actor = await requireUserByEmail(actorEmail);
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true, shareToken: true },
  });

  if (!project) {
    fail(404, 'Not found');
  }

  if (project.userId !== actor.id) {
    fail(403, 'Forbidden');
  }

  let shareToken = project.shareToken;

  if (!shareToken || options.rotate) {
    shareToken = randomBytes(24).toString('hex');
    await prisma.project.update({
      where: { id: projectId },
      data: { shareToken },
    });
  }

  return {
    token: shareToken,
    url: `/project/${project.id}?invite=${shareToken}`,
  };
}

export async function inviteProjectCollaborator(
  projectId: string,
  actorEmail: string,
  identifier: string,
) {
  const actor = await requireUserByEmail(actorEmail);
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true },
  });

  if (!project || project.userId !== actor.id) {
    fail(403, 'Forbidden');
  }

  const normalizedIdentifier = identifier.trim().toLowerCase();
  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: normalizedIdentifier, mode: 'insensitive' } },
        { email: { equals: identifier, mode: 'insensitive' } },
      ],
    },
  });

  if (!targetUser) {
    fail(404, 'User not found');
  }

  if (targetUser.id === actor.id) {
    fail(400, 'You are already the owner');
  }

  const existing = await prisma.collaborator.findFirst({
    where: {
      projectId,
      userId: targetUser.id,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
        },
      },
    },
  });

  if (existing) {
    if (existing.role !== 'editor') {
      const upgraded = await prisma.collaborator.update({
        where: { id: existing.id },
        data: { role: 'editor' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
      });

      return serializeCollaborator(upgraded);
    }

    return serializeCollaborator(existing);
  }

  await prisma.collaborator.createMany({
    data: [{ projectId, userId: targetUser.id, role: 'editor' }],
    skipDuplicates: true,
  });

  const collaborator = await prisma.collaborator.findFirst({
    where: {
      projectId,
      userId: targetUser.id,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
        },
      },
    },
  });

  if (!collaborator) {
    fail(500, 'Failed to invite collaborator');
  }

  return serializeCollaborator(collaborator);
}

export async function listProjectCollaborators(projectId: string, actorEmail: string) {
  const actor = await requireUserByEmail(actorEmail);
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      user: {
        select: { id: true, name: true, username: true, image: true },
      },
      collaborators: {
        include: {
          user: {
            select: { id: true, name: true, username: true, image: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!project) {
    fail(404, 'Not found');
  }

  const isOwner = project.userId === actor.id;
  const membership = isOwner
    ? null
    : await prisma.collaborator.findFirst({
        where: {
          projectId,
          userId: actor.id,
        },
      });

  if (!isOwner && !membership) {
    fail(404, 'Not found');
  }

  return {
    owner: {
      id: project.user.id,
      name: project.user.name,
      username: project.user.username,
      image: project.user.image,
      role: 'owner' as const,
    },
    collaborators: project.collaborators.map(entry => ({
      id: entry.user.id,
      name: entry.user.name,
      username: entry.user.username,
      image: entry.user.image,
      role: toViewerRole(entry.role),
    })),
  };
}

export async function removeProjectCollaborator(
  projectId: string,
  actorEmail: string,
  targetUserId: string,
) {
  const actor = await requireUserByEmail(actorEmail);
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true },
  });

  if (!project || project.userId !== actor.id) {
    fail(403, 'Forbidden');
  }

  if (targetUserId === project.userId) {
    fail(400, 'Cannot remove the project owner');
  }

  const nextCollaborationKey = randomBytes(24).toString('hex');
  const nextShareToken = randomBytes(24).toString('hex');

  await prisma.$transaction([
    prisma.collaborator.deleteMany({
      where: {
        projectId,
        userId: targetUserId,
      },
    }),
    prisma.project.update({
      where: { id: projectId },
      data: {
        collaborationKey: nextCollaborationKey,
        shareToken: nextShareToken,
      },
    }),
  ]);

  return {
    ok: true,
    collaborationKey: nextCollaborationKey,
    shareToken: nextShareToken,
    shareUrl: `/project/${projectId}?invite=${nextShareToken}`,
  };
}
