const PROJECT_ROOM_PREFIX = 'project-';

export function projectRoomId(projectId: string): string {
  return `${PROJECT_ROOM_PREFIX}${projectId}`;
}

export function parseProjectRoomId(room: string): { projectId: string } | null {
  if (typeof room !== 'string') return null;
  const trimmed = room.trim();
  if (!trimmed.startsWith(PROJECT_ROOM_PREFIX)) return null;
  const projectId = trimmed.slice(PROJECT_ROOM_PREFIX.length);
  if (projectId.length === 0) return null;
  return { projectId };
}
