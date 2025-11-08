export type ViewerRole = 'owner' | 'editor' | 'viewer';

export type CollaboratorInfo = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  role: ViewerRole;
};

export type LocalCollaboratorPresence = {
  id: string;
  name: string | null;
  color: string;
  avatar: string | null;
};

export type CollaboratorPresence = {
  clientId: string;
  userId: string;
  name: string | null;
  color: string;
  avatar: string | null;
  isSelf: boolean;
};
