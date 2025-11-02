import Link from 'next/link';
import type { ReactNode } from 'react';

import { workspaceList } from '@/lib/project';

const languageIcons: Record<string, ReactNode> = {
  web: (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 text-emerald-300">
      <circle cx="12" cy="12" r="9" className="fill-current opacity-20" />
      <path
        d="M3 12h18m-9-9c3 4.5 3 13.5 0 18m6-18c2.25 4.5 2.25 13.5 0 18"
        className="fill-none stroke-current stroke-[1.5]"
      />
    </svg>
  ),
  python: (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 text-sky-300">
      <path
        d="M11.5 3h1.75a3.75 3.75 0 0 1 3.75 3.75V9H9.5A2.5 2.5 0 0 0 7 11.5v1A3.5 3.5 0 0 1 3.5 16v-5.25A3.75 3.75 0 0 1 7.25 7h2.25V6.75A3.75 3.75 0 0 1 11.5 3Z"
        className="fill-current opacity-80"
      />
      <path
        d="M12.5 21h-1.75A3.75 3.75 0 0 1 7 17.25V15h7.5A2.5 2.5 0 0 0 17 12.5v-1A3.5 3.5 0 0 1 20.5 8v5.25A3.75 3.75 0 0 1 16.75 17H14v.25A3.75 3.75 0 0 1 12.5 21Z"
        className="fill-current opacity-50"
      />
      <circle cx="10.75" cy="6.5" r="1" className="fill-slate-950" />
      <circle cx="13.25" cy="17.5" r="1" className="fill-slate-950" />
    </svg>
  ),
  c: (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 text-violet-300">
      <path
        d="M12 4.75c1.74 0 3.31.7 4.45 1.83l1.8-1.8A9 9 0 1 0 12 21a8.97 8.97 0 0 0 6.24-2.5l-1.77-1.78A6.5 6.5 0 1 1 12 5.5"
        className="fill-none stroke-current stroke-[1.6]"
      />
    </svg>
  ),
  java: (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 text-amber-300">
      <path
        d="M12 4.25c1.61 1.2 2.25 2.28 2.25 3.18 0 1.08-.9 1.8-2.25 2.57-1.35-.77-2.25-1.49-2.25-2.57 0-.9.64-1.98 2.25-3.18Z"
        className="fill-none stroke-current stroke-[1.4]"
      />
      <path
        d="M15.5 12c1.3.58 2 1.23 2 1.96 0 1.37-2.56 2.31-5.5 2.31s-5.5-.94-5.5-2.31c0-.73.7-1.38 2-1.96"
        className="fill-none stroke-current stroke-[1.4]"
      />
      <path
        d="M16.5 18.5c-.9.74-2.6 1.25-4.5 1.25s-3.6-.51-4.5-1.25"
        className="fill-none stroke-current stroke-[1.4]"
      />
    </svg>
  )
};

const defaultIcon = (
  <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 text-white/70">
    <rect x="4" y="4" width="16" height="16" rx="3" className="fill-none stroke-current stroke-[1.5]" />
    <path d="M9 8h6m-6 4h6m-6 4h3" className="fill-none stroke-current stroke-[1.5]" />
  </svg>
);

export default function WorkspacePicker() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#06070d] via-[#090b19] to-[#040509] text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(120,119,198,0.25),_transparent_60%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-12 px-6 py-16">
        <header className="flex flex-col gap-3 text-center">
          <h1 className="text-3xl font-semibold sm:text-4xl">Choose your language</h1>
          <p className="text-sm text-white/70 sm:text-base">
            Launch a workspace configured for your stack.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          {workspaceList.map(workspace => {
            const icon = languageIcons[workspace.slug] ?? defaultIcon;
            return (
              <Link
                key={workspace.slug}
                href={`/ide/${workspace.slug}`}
                className="group flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/20 hover:bg-white/10"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-black/40 text-white">
                  {icon}
                </span>
                <div className="flex flex-col gap-1 text-left">
                  <h2 className="text-lg font-semibold">{workspace.title}</h2>
                  <p className="text-sm text-white/60">{workspace.description}</p>
                </div>
                <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-emerald-200">
                  Open workspace
                  <span aria-hidden className="transition group-hover:translate-x-1">→</span>
                </span>
              </Link>
            );
          })}
        </div>
        <p className="text-center text-xs text-white/50">
          Need another language? Let us know at{' '}
          <a className="text-emerald-200 underline decoration-emerald-400/60 underline-offset-4" href="mailto:hello@yentic.com">
            hello@yentic.com
          </a>
          .
        </p>
        <div className="flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
