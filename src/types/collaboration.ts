export type ViewerRole = 'owner' | 'editor' | 'viewer';

export type CollaboratorInfo = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  role: ViewerRole;
};
