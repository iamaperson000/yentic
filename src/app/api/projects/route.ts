import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

type ViewerRole = 'owner' | 'editor' | 'viewer';

function encodeState(state: Uint8Array | null | undefined): string | null {
  if (!state || !state.length) {
    return null;
  }
  return Buffer.from(state).toString('base64');
}

function decodeState(encoded?: string | null): Buffer | null {
  if (!encoded) {
    return null;
  }
  try {
    return Buffer.from(encoded, 'base64');
  } catch {
    return null;
  }
}

export async function GET() {
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

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { userId: user.id },
        { collaborators: { some: { userId: user.id } } },
      ],
    },
    include: {
      collaborators: {
        where: { userId: user.id },
        select: { role: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const normalized = projects.map(project => {
    const { collaborators: memberships, yjsState, ...rest } = project;
    const viewerRole: ViewerRole = project.userId === user.id
      ? 'owner'
      : memberships[0]?.role ?? 'viewer';
    return {
      ...rest,
      yjsState: encodeState(yjsState),
      viewerRole,
    };
  });

  return NextResponse.json(normalized);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = await prisma.user.upsert({
    where: { email: session.user.email },
    update: {},
    create: {
      email: session.user.email,
      name: session.user.name ?? 'Anonymous',
      image: session.user.image ?? '',
    },
  });

  const payload = await req.json();
  const { id, name, language, files } = payload as {
    id?: string;
    name?: string;
    language?: string;
    files: unknown;
    yjsState?: string | null;
  };

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
  }

  const decodedState = 'yjsState' in payload ? decodeState(payload.yjsState) : undefined;

  if (id) {
    const existing = await prisma.project.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const isOwner = existing.userId === user.id;
    const membership = isOwner
      ? null
      : await prisma.collaborator.findFirst({
          where: { projectId: id, userId: user.id },
        });

    if (!isOwner && !membership) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (membership && membership.role !== 'editor') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const data: Record<string, unknown> = {
      files,
    };

    if (decodedState !== undefined) {
      data.yjsState = decodedState;
    }

    if (isOwner) {
      data.name = name.trim();
      data.language = language;
    }

    const project = await prisma.project.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      ...project,
      yjsState: encodeState(project.yjsState),
      viewerRole: isOwner ? 'owner' : membership?.role ?? 'viewer',
    });
  }

  const project = await prisma.project.upsert({
    where: {
      userId_name: {
        userId: user.id,
        name: name.trim(),
      },
    },
    update: {
      language,
      files,
      updatedAt: new Date(),
      ...(decodedState !== undefined ? { yjsState: decodedState } : {}),
    },
    create: {
      name: name.trim(),
      language,
      files,
      userId: user.id,
      ...(decodedState !== undefined ? { yjsState: decodedState } : {}),
    },
  });

  return NextResponse.json({
    ...project,
    yjsState: encodeState(project.yjsState),
    viewerRole: 'owner' as ViewerRole,
  });
}