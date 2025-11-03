import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  const projects = await prisma.project.findMany({
    where: { userId: user?.id },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(projects);
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

  const { name, language, files } = await req.json();

  const project = await prisma.project.upsert({
    where: {
      userId_name: {
        userId: user.id,
        name,
      },
    },
    update: {
      language,
      files,
      updatedAt: new Date(),
    },
    create: {
      name,
      language,
      files,
      userId: user.id,
    },
  });

  return NextResponse.json(project);
}