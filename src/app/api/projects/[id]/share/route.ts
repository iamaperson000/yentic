import { randomBytes } from 'crypto';
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
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, shareToken: true },
  });

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (project.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let rotate = false;
  try {
    const body = await req.json();
    if (body && typeof body === 'object' && 'rotate' in body) {
      rotate = Boolean((body as { rotate?: unknown }).rotate);
    }
  } catch {
    rotate = false;
  }

  let shareToken = project.shareToken;

  if (!shareToken || rotate) {
    shareToken = randomBytes(24).toString('hex');
    await prisma.project.update({
      where: { id: params.id },
      data: { shareToken },
    });
  }

  const url = `/project/${project.id}?invite=${shareToken}`;

  return NextResponse.json({ token: shareToken, url });
}
