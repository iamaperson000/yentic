import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  const body = (await req.json()) as { userId?: string };
  const targetId = body.userId?.trim();

  if (!targetId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  if (targetId === project.userId) {
    return NextResponse.json({ error: 'Cannot remove the project owner' }, { status: 400 });
  }

  await prisma.collaborator.deleteMany({
    where: {
      projectId: params.id,
      userId: targetId,
    },
  });

  return NextResponse.json({ ok: true });
}
