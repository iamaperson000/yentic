import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

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
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      userId: true,
      collaborationKey: true,
      shareToken: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isOwner = project.userId === user.id;
  if (!isOwner) {
    const membership = await prisma.collaborator.findFirst({
      where: {
        projectId: params.id,
        userId: user.id,
      },
      select: { id: true },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  }

  return NextResponse.json({
    collaborationKey: project.collaborationKey,
    shareToken: isOwner ? project.shareToken ?? null : null,
  });
}

export async function POST() {
  return NextResponse.json(
    { error: 'Collaboration events are no longer handled by this endpoint.' },
    { status: 410 },
  );
}
