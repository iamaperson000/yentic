export type ProjectScope = 'owned' | 'shared';

export type ProjectMenuAction = 'open' | 'rename' | 'delete' | 'share';

export type HomeProjectSummary = {
  id: string;
  name: string;
  language: string;
  updatedAt: string;
  viewerRole: 'owner' | 'editor' | 'viewer';
  user?: {
    name: string | null;
    username: string | null;
    image: string | null;
  };
  shareToken?: string | null;
};

const OWNED_MENU_ACTIONS: readonly ProjectMenuAction[] = [
  'open',
  'rename',
  'delete',
  'share',
];

const SHARED_MENU_ACTIONS: readonly ProjectMenuAction[] = ['open', 'rename'];

export function filterProjectsByQuery(
  projects: HomeProjectSummary[],
  query: string,
): HomeProjectSummary[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return projects;
  }

  return projects.filter((project) =>
    project.name.trim().toLowerCase().includes(normalizedQuery),
  );
}

export function getMenuActionsForScope(
  scope: ProjectScope,
): ProjectMenuAction[] {
  return scope === 'owned'
    ? [...OWNED_MENU_ACTIONS]
    : [...SHARED_MENU_ACTIONS];
}
