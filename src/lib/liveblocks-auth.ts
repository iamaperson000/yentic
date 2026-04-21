import { parseProjectRoomId } from './room-id';

type ProjectForAccess = {
  id: string;
  userId: string;
  collaborators: { userId: string; role: string }[];
};

export type RoomAccessInput = {
  userId: string | null;
  room: string;
  loadProject: (projectId: string) => Promise<ProjectForAccess | null>;
};

export type RoomAccessResult =
  | { kind: 'unauthorized' }
  | { kind: 'bad-room' }
  | { kind: 'not-found' }
  | { kind: 'forbidden' }
  | { kind: 'allow'; access: 'full' | 'read'; projectId: string };

export async function resolveRoomAccess(input: RoomAccessInput): Promise<RoomAccessResult> {
  if (!input.userId) {
    return { kind: 'unauthorized' };
  }

  const parsed = parseProjectRoomId(input.room);
  if (!parsed) {
    return { kind: 'bad-room' };
  }

  const project = await input.loadProject(parsed.projectId);
  if (!project) {
    return { kind: 'not-found' };
  }

  if (project.userId === input.userId) {
    return { kind: 'allow', access: 'full', projectId: project.id };
  }

  const collaborator = project.collaborators.find(c => c.userId === input.userId);
  if (!collaborator) {
    return { kind: 'forbidden' };
  }

  const access = collaborator.role === 'viewer' ? 'read' : 'full';
  return { kind: 'allow', access, projectId: project.id };
}
