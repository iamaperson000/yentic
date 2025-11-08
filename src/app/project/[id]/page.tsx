import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { resolveWorkspaceSlugFromLanguage } from '@/lib/project';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ invite?: string }>;
};

export default async function ProjectInvitePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const inviteToken = query.invite;

  if (!inviteToken) {
    notFound();
  }

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, language: true, userId: true, shareToken: true },
  });

  if (!project || !project.shareToken || project.shareToken !== inviteToken) {
    notFound();
  }

  const encodedToken = encodeURIComponent(inviteToken);
  const callbackPath = `/project/${project.id}?invite=${encodedToken}`;
  const callbackUrl = encodeURIComponent(callbackPath);

  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect(`/api/auth/signin?callbackUrl=${callbackUrl}`);
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    redirect(`/api/auth/signin?callbackUrl=${callbackUrl}`);
  }

  if (project.userId !== user.id) {
    const existing = await prisma.collaborator.findFirst({
      where: { projectId: project.id, userId: user.id },
    });

    if (!existing) {
      await prisma.collaborator.create({
        data: { projectId: project.id, userId: user.id, role: 'viewer' },
      });
    }
  }

  const slug = resolveWorkspaceSlugFromLanguage(project.language);

  redirect(`/ide/${slug}?projectId=${project.id}`);
}
