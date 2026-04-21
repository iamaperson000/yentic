import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { getLiveblocksServer } from '@/lib/liveblocks-server';
import { resolveRoomAccess } from '@/lib/liveblocks-auth';
import prisma from '@/lib/prisma';

type AuthRequestBody = { room?: unknown };

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  let body: AuthRequestBody;
  try {
    body = (await request.json()) as AuthRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const room = typeof body.room === 'string' ? body.room : '';
  if (!room) {
    return NextResponse.json({ error: 'Missing room' }, { status: 400 });
  }

  const result = await resolveRoomAccess({
    userId,
    room,
    loadProject: async (projectId: string) =>
      prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          userId: true,
          collaborators: { select: { userId: true, role: true } },
        },
      }),
  });

  if (result.kind === 'unauthorized') {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  if (result.kind === 'bad-room') {
    return NextResponse.json({ error: 'Invalid room' }, { status: 400 });
  }
  if (result.kind === 'not-found') {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  if (result.kind === 'forbidden') {
    return NextResponse.json({ error: 'No access to this project' }, { status: 403 });
  }

  const liveblocks = getLiveblocksServer();
  const lbSession = liveblocks.prepareSession(userId!, {
    userInfo: {
      name: session?.user?.name ?? session?.user?.email ?? 'Anonymous',
      avatar: session?.user?.image ?? undefined,
    },
  });

  if (result.access === 'full') {
    lbSession.allow(room, lbSession.FULL_ACCESS);
  } else {
    lbSession.allow(room, lbSession.READ_ACCESS);
  }

  const { status, body: tokenBody } = await lbSession.authorize();
  return new NextResponse(tokenBody, { status, headers: { 'Content-Type': 'application/json' } });
}
