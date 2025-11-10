import { randomUUID } from 'crypto';
import { redirect } from 'next/navigation';

import { resolveWorkspaceSlugFromLanguage } from '@/lib/project';

type PageProps = {
  params: Promise<{ language: string }>;
};

function generateWorkspaceId() {
  try {
    return randomUUID();
  } catch {
    return `ws-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  }
}

export default async function LegacyWorkspaceRedirect({ params }: PageProps) {
  const { language } = await params;
  const slug = resolveWorkspaceSlugFromLanguage(language);
  const workspaceId = generateWorkspaceId();

  redirect(`/${workspaceId}?template=${slug}&new=1`);
}
