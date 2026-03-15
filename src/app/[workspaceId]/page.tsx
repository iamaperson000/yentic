import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import WorkspaceClient from '@/components/WorkspaceClient';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  resolveWorkspaceSlugFromLanguage,
  type ProjectFileMap,
  type WorkspaceSlug,
} from '@/lib/project';
import { type ViewerRole } from '@/types/collaboration';

type PageProps = {
  params: Promise<{ workspaceId: string }>;
  searchParams?: Promise<{ [key: string]: string | undefined }>;
};

type CloudProjectPayload = {
  id: string;
  name: string;
  language: string;
  files: ProjectFileMap;
  updatedAt: string;
  yjsState: string | null;
  shareToken: string | null;
};

type ProjectCollaborator = {
  userId: string;
  role: string;
};

function encodeState(state: Uint8Array | Buffer | null | undefined): string | null {
  if (!state || !state.length) {
    return null;
  }
  return Buffer.from(state).toString('base64');
}

export default async function WorkspaceRoute({ params, searchParams }: PageProps) {
  const { workspaceId } = await params;
  const query = (await searchParams) ?? {};
  const session = await getServerSession(authOptions);

  let initialProject: CloudProjectPayload | null = null;
  let initialViewerRole: ViewerRole = 'owner';
  let initialSlug: WorkspaceSlug = 'web';

  const project = await prisma.project.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      language: true,
      files: true,
      updatedAt: true,
      yjsState: true,
      userId: true,
      shareToken: true,
      collaborators: {
        select: { userId: true, role: true },
      },
    },
  });

  if (project) {
    const email = session?.user?.email ?? null;
    if (!email) {
      const callback = encodeURIComponent(`/${workspaceId}`);
      redirect(`/api/auth/signin?callbackUrl=${callback}`);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      const callback = encodeURIComponent(`/${workspaceId}`);
      redirect(`/api/auth/signin?callbackUrl=${callback}`);
    }

    const isOwner = project.userId === user.id;
    const membership = project.collaborators.find((entry: ProjectCollaborator) => entry.userId === user.id);

    if (!isOwner && !membership) {
      redirect('/ide');
    }

    initialViewerRole = isOwner
      ? 'owner'
      : membership?.role === 'editor'
      ? 'editor'
      : 'viewer';

    initialProject = {
      id: project.id,
      name: project.name,
      language: project.language,
      files: (project.files ?? {}) as ProjectFileMap,
      updatedAt: project.updatedAt.toISOString(),
      yjsState: encodeState(project.yjsState),
      shareToken: project.shareToken ?? null,
    };

    initialSlug = resolveWorkspaceSlugFromLanguage(project.language);
  } else {
    if (typeof query.template === 'string' && query.template.length > 0) {
      initialSlug = resolveWorkspaceSlugFromLanguage(query.template);
    }
  }

  return (
    <WorkspaceClient
      workspaceId={workspaceId}
      initialSlug={initialSlug}
      initialProject={initialProject}
      initialViewerRole={initialViewerRole}
    />
  );
}
