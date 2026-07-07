import { NextResponse } from 'next/server';

import { getLiveblocksServer } from '@/lib/liveblocks-server';

type DemoAuthBody = { room?: unknown };

/**
 * Anonymous auth for the public collaboration demo. Grants a throwaway guest
 * identity FULL access to `demo:*` rooms only — it can never authorize a real
 * `project-` room, so the demo can't touch anyone's saved work.
 */
export async function POST(request: Request) {
  let body: DemoAuthBody;
  try {
    body = (await request.json()) as DemoAuthBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const room = typeof body.room === 'string' ? body.room : '';
  if (!room.startsWith('demo:')) {
    return NextResponse.json({ error: 'Demo auth only grants demo rooms' }, { status: 403 });
  }

  const guestId = `guest-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  const liveblocks = getLiveblocksServer();
  const session = liveblocks.prepareSession(guestId, {
    userInfo: { name: 'Guest', avatar: undefined },
  });
  session.allow(room, session.FULL_ACCESS);

  const { status, body: tokenBody } = await session.authorize();
  return new NextResponse(tokenBody, { status, headers: { 'Content-Type': 'application/json' } });
}
