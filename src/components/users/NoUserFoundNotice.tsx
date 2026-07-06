'use client';

import Link from 'next/link';
import { useState } from 'react';

export function NoUserFoundNotice({ username }: { username: string }) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="rounded-[12px] border p-6" style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)' }}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-base font-semibold" style={{ color: 'var(--y-fg)' }}>No user found</p>
            <p className="text-sm" style={{ color: 'var(--y-muted)' }}>
              We could not find a profile for <span className="font-medium" style={{ color: 'var(--y-fg)' }}>@{username}</span>. Double-check the spelling or try
              searching again.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-lg leading-none transition"
            style={{ borderColor: 'var(--y-line)', background: 'var(--y-ink)', color: 'var(--y-muted)' }}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/users"
            className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition"
            style={{ borderColor: 'var(--y-line)', color: 'var(--y-fg)' }}
          >
            Browse all users
          </Link>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition"
            style={{ color: 'var(--y-muted)' }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
