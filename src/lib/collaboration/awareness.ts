import type { Awareness } from 'y-protocols/awareness';

import type { AwarenessCursor, AwarenessUserState, CollaborationUser } from './types';

const USER_FIELD = 'user';
const CURSOR_FIELD = 'cursor';

export function setLocalUserAwareness(awareness: Awareness, user: CollaborationUser) {
  awareness.setLocalStateField(USER_FIELD, {
    id: user.id ?? null,
    name: user.name,
    color: user.color,
    avatar: user.avatar ?? null,
  });
}

export function updateLocalCursor(awareness: Awareness, cursor: AwarenessCursor | null) {
  awareness.setLocalStateField(CURSOR_FIELD, cursor);
}

export function collectAwarenessStates(awareness: Awareness): AwarenessUserState[] {
  return Array.from(awareness.getStates().entries()).map(([clientId, state]) => {
    const user = (state as { [USER_FIELD]?: unknown })[USER_FIELD] as
      | { id?: string | null; name?: string | null; color?: string | null; avatar?: string | null }
      | undefined;
    const cursor = (state as { [CURSOR_FIELD]?: unknown })[CURSOR_FIELD] as AwarenessCursor | null;

    return {
      clientId,
      userId: user?.id ?? null,
      name: user?.name ?? null,
      color: user?.color ?? null,
      avatar: user?.avatar ?? null,
      cursor: cursor ?? null,
    } satisfies AwarenessUserState;
  });
}

export function onAwarenessChange(awareness: Awareness, handler: (states: AwarenessUserState[]) => void) {
  const listener = () => handler(collectAwarenessStates(awareness));
  awareness.on('change', listener);
  listener();
  return () => awareness.off('change', listener);
}
