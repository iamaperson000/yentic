'use client';

import Link from 'next/link';
import { useState } from 'react';

export function NoUserFoundNotice({ username }: { username: string }) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-[10px] border border-[#2d3643] bg-[#171d27] p-6">
      <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(to_right,rgba(220,229,240,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(220,229,240,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-base font-semibold text-[#edf3fb]">No user found</p>
            <p className="text-sm text-[#b8c5d6]">
              We could not find a profile for <span className="font-medium">@{username}</span>. Double-check the spelling or try
              searching again.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#445162] bg-[#131923] text-lg leading-none text-[#d3dfee] transition hover:border-[#8ea0b6] hover:text-white"
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/users"
            className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/85 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
          >
            Browse all users
          </Link>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="inline-flex items-center justify-center rounded-full border border-transparent bg-transparent px-4 py-2 text-sm font-medium text-[#b8c5d6] transition hover:text-white"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
