import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import {
  inviteProjectCollaborator,
  ProjectCollaborationError,
} from '@/lib/project-collaboration';

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

  const body = (await req.json().catch(() => null)) as { username?: string } | null;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const identifier = body.username?.trim();

  if (!identifier) {
    return NextResponse.json({ error: 'Username or email is required' }, { status: 400 });
  }

  try {
    const payload = await inviteProjectCollaborator(
      params.id,
      session.user.email,
      identifier,
    );
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof ProjectCollaborationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
