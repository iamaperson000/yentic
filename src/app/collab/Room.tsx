"use client";

import { ReactNode } from "react";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";

export function Room({ children }: { children: ReactNode }) {
  const publicApiKey = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;
  if (!publicApiKey) {
    // Degrade instead of crashing the build/page when the key isn't set.
    return <div className="collab-loading">Live collaboration isn&apos;t available right now.</div>;
  }
  return (
    <LiveblocksProvider publicApiKey={publicApiKey}>
      <RoomProvider id="yentic-collab-room">
        <ClientSideSuspense fallback={<div className="collab-loading">Loading…</div>}>
          {children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
