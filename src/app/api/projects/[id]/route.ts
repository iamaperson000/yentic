import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function encodeState(state: Uint8Array | null | undefined): string | null {
  if (!state || !state.length) {
    return null;
  }
  return Buffer.from(state).toString('base64');
}

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
    select: {
      id: true,
      name: true,
      language: true,
      files: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      yjsState: true,
      shareToken: true,
      collaborationKey: true,
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

  const { yjsState, ...rest } = project;

  return NextResponse.json({
    ...rest,
    shareToken: isOwner ? project.shareToken ?? null : null,
    yjsState: encodeState(yjsState),
    viewerRole: isOwner ? 'owner' : membership?.role ?? 'viewer',
  });
}
