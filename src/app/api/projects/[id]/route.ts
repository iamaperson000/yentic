import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ViewerRole = 'owner' | 'editor' | 'viewer';

function encodeState(state: Uint8Array | null | undefined): string | null {
  if (!state || !state.length) {
    return null;
  }
  return Buffer.from(state).toString('base64');
}

async function requireCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!process.env.DATABASE_URL) {
    return {
      error: NextResponse.json(
        { error: 'Database connection is not configured' },
        { status: 503 },
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { user };
}

async function getProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
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
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }

  const isOwner = project.userId === userId;
  const membership = isOwner
    ? null
    : await prisma.collaborator.findFirst({
        where: {
          projectId,
          userId,
        },
      });

  if (!isOwner && !membership) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }

  const viewerRole: ViewerRole = isOwner
    ? 'owner'
    : membership?.role === 'viewer'
      ? 'viewer'
      : 'editor';

  return { project, isOwner, viewerRole };
}

export async function GET(_req: Request, context: RouteContext) {
  const params = await context.params;
  const actor = await requireCurrentUser();

  if ('error' in actor) {
    return actor.error;
  }

  const access = await getProjectAccess(params.id, actor.user.id);
  if ('error' in access) {
    return access.error;
  }

  const { project, isOwner, viewerRole } = access;
  const { yjsState, ...rest } = project;

  return NextResponse.json({
    ...rest,
    shareToken: isOwner ? project.shareToken ?? null : null,
    yjsState: encodeState(yjsState),
    viewerRole,
  });
}

export async function PATCH(req: Request, context: RouteContext) {
  const params = await context.params;
  const actor = await requireCurrentUser();

  if ('error' in actor) {
    return actor.error;
  }

  const payload = (await req.json().catch(() => null)) as { name?: unknown } | null;
  const nextName = typeof payload?.name === 'string' ? payload.name.trim() : '';

  if (!nextName) {
    return NextResponse.json(
      { error: 'Project name is required' },
      { status: 400 },
    );
  }

  const access = await getProjectAccess(params.id, actor.user.id);
  if ('error' in access) {
    return access.error;
  }

  const duplicate = await prisma.project.findFirst({
    where: {
      userId: access.project.userId,
      name: nextName,
      NOT: { id: access.project.id },
    },
    select: { id: true },
  });

  if (duplicate) {
    return NextResponse.json(
      { error: 'A project with that name already exists' },
      { status: 409 },
    );
  }

  const updated = await prisma.project.update({
    where: { id: access.project.id },
    data: { name: nextName },
    select: {
      id: true,
      name: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    ...updated,
    viewerRole: access.viewerRole,
  });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const params = await context.params;
  const actor = await requireCurrentUser();

  if ('error' in actor) {
    return actor.error;
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true },
  });

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (project.userId !== actor.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.project.delete({ where: { id: project.id } });

  return NextResponse.json({ ok: true, id: project.id });
}
