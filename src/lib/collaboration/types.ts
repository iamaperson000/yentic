import type { Awareness } from 'y-protocols/awareness';
import type { WebsocketProvider } from 'y-websocket';
import type * as Y from 'yjs';

export type CollaborationUser = {
  id?: string | null;
  name: string;
  color: string;
  avatar?: string | null;
};

export type AwarenessCursor = {
  anchor: number;
  head: number;
};

export type AwarenessUserState = {
  clientId: number;
  userId: string | null;
  name: string | null;
  color: string | null;
  avatar: string | null;
  cursor: AwarenessCursor | null;
};

export type RoomConnection = {
  roomName: string;
  doc: Y.Doc;
  provider: WebsocketProvider;
  awareness: Awareness;
  destroy: () => void;
};
