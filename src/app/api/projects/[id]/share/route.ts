import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import {
  createProjectShareLink,
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

  let rotate = false;
  try {
    const body = await req.json();
    if (body && typeof body === 'object' && 'rotate' in body) {
      rotate = Boolean((body as { rotate?: unknown }).rotate);
    }
  } catch {
    rotate = false;
  }

  try {
    const payload = await createProjectShareLink(params.id, session.user.email, {
      rotate,
    });
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof ProjectCollaborationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
