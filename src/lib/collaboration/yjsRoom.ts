import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

import { Y_WEBSOCKET_ENDPOINT } from './constants';
import type { RoomConnection } from './types';

export function createRoomConnection(roomName: string, endpoint = Y_WEBSOCKET_ENDPOINT): RoomConnection {
  const doc = new Y.Doc();
  const provider = new WebsocketProvider(endpoint, roomName, doc, {
    connect: true,
    // disableBc if you do not want broadcast-channel syncing across tabs
  });

  const destroy = () => {
    provider.disconnect();
    provider.destroy();
    doc.destroy();
  };

  return { roomName, doc, provider, awareness: provider.awareness, destroy };
}

export function switchRoomConnection(existing: RoomConnection | null, nextRoom: string, endpoint = Y_WEBSOCKET_ENDPOINT) {
  if (existing) {
    existing.destroy();
  }
  return createRoomConnection(nextRoom, endpoint);
}
