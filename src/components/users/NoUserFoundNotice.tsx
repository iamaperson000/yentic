"use client";

import Link from "next/link";
import { useState } from "react";

export function NoUserFoundNotice({ username }: { username: string }) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-rose-400/40 bg-rose-500/10 p-6 shadow-lg shadow-rose-500/20">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-rose-500/20 via-transparent to-transparent" />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-base font-semibold text-rose-100">No user found</p>
            <p className="text-sm text-rose-100/80">
              We couldn&apos;t find a profile for <span className="font-medium">@{username}</span>. Double-check the spelling or try
              searching again.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200/30 bg-rose-200/10 text-lg leading-none text-rose-50 transition hover:border-rose-200/60 hover:bg-rose-200/20"
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/users"
            className="inline-flex items-center justify-center rounded-full border border-rose-200/40 bg-rose-200/10 px-4 py-2 text-sm font-medium text-rose-50 transition hover:border-rose-200/60 hover:bg-rose-200/20"
          >
            Browse all users
          </Link>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="inline-flex items-center justify-center rounded-full border border-transparent bg-transparent px-4 py-2 text-sm font-medium text-rose-100/80 transition hover:text-rose-100"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
