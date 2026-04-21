declare global {
  interface Liveblocks {
    Presence: {};
    Storage: {};
    UserMeta: {
      id: string;
      info: {
        name?: string;
        avatar?: string;
      };
    };
    RoomEvent: {};
    ThreadMetadata: {};
    RoomInfo: {};
  }
}

export {};
