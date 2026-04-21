"use client";

import { ReactNode } from "react";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";

export function Room({ children }: { children: ReactNode }) {
  return (
    <LiveblocksProvider publicApiKey={process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!}>
      <RoomProvider id="yentic-collab-room">
        <ClientSideSuspense fallback={<div className="collab-loading">Loading…</div>}>
          {children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
