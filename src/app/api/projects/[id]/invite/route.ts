import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CollaboratorPayload = {
  collaborator: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    role: string;
  };
};

function serializeCollaborator(entry: {
  role: string;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  };
}): CollaboratorPayload {
  return {
    collaborator: {
      id: entry.user.id,
      name: entry.user.name,
      username: entry.user.username,
      image: entry.user.image,
      role: entry.role,
    },
  };
}

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'Database connection is not configured' },
      { status: 503 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true },
  });

  if (!project || project.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { username?: string } | null;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const identifier = body.username?.trim();

  if (!identifier) {
    return NextResponse.json({ error: 'Username or email is required' }, { status: 400 });
  }

  const normalizedIdentifier = identifier.toLowerCase();

  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: normalizedIdentifier, mode: 'insensitive' } },
        { email: { equals: identifier, mode: 'insensitive' } },
      ],
    },
  });

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (targetUser.id === user.id) {
    return NextResponse.json({ error: 'You are already the owner' }, { status: 400 });
  }

  const existing = await prisma.collaborator.findFirst({
    where: {
      projectId: params.id,
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

      return NextResponse.json(serializeCollaborator(upgraded));
    }

    return NextResponse.json(serializeCollaborator(existing));
  }

  await prisma.collaborator.createMany({
    data: [
      {
        projectId: params.id,
        userId: targetUser.id,
        role: 'editor',
      },
    ],
    skipDuplicates: true,
  });

  const collaborator = await prisma.collaborator.findFirst({
    where: {
      projectId: params.id,
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
    return NextResponse.json({ error: 'Failed to invite collaborator' }, { status: 500 });
  }

  return NextResponse.json(serializeCollaborator(collaborator));
}
