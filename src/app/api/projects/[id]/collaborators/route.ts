import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
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
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isOwner = project.userId === user.id;
  const membership = isOwner
    ? null
    : await prisma.collaborator.findFirst({
        where: {
          projectId: params.id,
          userId: user.id,
        },
      });

  if (!isOwner && !membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const owner = {
    id: project.user.id,
    name: project.user.name,
    username: project.user.username,
    image: project.user.image,
    role: 'owner' as const,
  };

  const collaborators = project.collaborators.map(entry => ({
    id: entry.user.id,
    name: entry.user.name,
    username: entry.user.username,
    image: entry.user.image,
    role: entry.role,
  }));

  return NextResponse.json({
    owner,
    collaborators,
  });
}
