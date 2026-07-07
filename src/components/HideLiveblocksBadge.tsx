'use client';

import { useEffect } from 'react';

/**
 * Hides the Liveblocks SDK's floating attribution badge. We credit our sponsor
 * prominently in the site footer ("proudly sponsored by Liveblocks") instead.
 * The badge is injected into <body> asynchronously after a room connects, so we
 * watch for it with a MutationObserver.
 */
export default function HideLiveblocksBadge() {
  useEffect(() => {
    const hide = () => {
      const el = document.getElementById('liveblocks-badge');
      if (el) el.style.setProperty('display', 'none', 'important');
    };
    hide();
    const observer = new MutationObserver(hide);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
