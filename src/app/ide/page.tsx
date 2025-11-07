import Link from 'next/link';
import type { ReactNode } from 'react';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { resolveWorkspaceSlugFromLanguage, workspaceConfigs, workspaceList } from '@/lib/project';

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
  cpp: (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 text-violet-200">
      <circle cx="12" cy="12" r="8" className="fill-none stroke-current stroke-[1.4] opacity-60" />
      <path d="M10 12h4" className="fill-none stroke-current stroke-[1.4]" strokeLinecap="round" />
      <path d="M12 10v4" className="fill-none stroke-current stroke-[1.4]" strokeLinecap="round" />
      <path d="M6.5 12a5.5 5.5 0 0 1 5.5-5.5" className="fill-none stroke-current stroke-[1.4] opacity-40" />
      <path d="M17.5 12a5.5 5.5 0 0 1-5.5 5.5" className="fill-none stroke-current stroke-[1.4] opacity-40" />
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

const accentGradient: Record<string, string> = {
  emerald: 'from-emerald-300/40 via-emerald-400/10 to-transparent',
  sky: 'from-sky-300/40 via-sky-400/10 to-transparent',
  violet: 'from-violet-300/40 via-violet-400/10 to-transparent',
  amber: 'from-amber-300/40 via-amber-400/10 to-transparent'
};

const accentGlow: Record<string, string> = {
  emerald: 'shadow-[0_0_25px_rgba(16,185,129,0.35)]',
  sky: 'shadow-[0_0_25px_rgba(56,189,248,0.35)]',
  violet: 'shadow-[0_0_25px_rgba(139,92,246,0.35)]',
  amber: 'shadow-[0_0_25px_rgba(245,158,11,0.35)]'
};

const highlights = [
  'Live Sandpack preview',
  'Runtime & console streaming',
  'Instant project scaffolding'
];

function formatTimeAgo(value: Date): string {
  const diff = Date.now() - value.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.round(diff / minute)} min ago`;
  if (diff < day) return `${Math.round(diff / hour)} hr ago`;
  return `${Math.round(diff / day)} day${diff >= 2 * day ? 's' : ''} ago`;
}

export default async function WorkspacePicker() {
  const session = await getServerSession(authOptions);
  const savedProjects = session?.user?.email
    ? await prisma.project.findMany({
        where: { user: { email: session.user.email } },
        orderBy: { updatedAt: 'desc' },
      })
    : [];

  const savedProjectCards = savedProjects.map(project => {
    const slug = resolveWorkspaceSlugFromLanguage(project.language);
    const workspace = workspaceConfigs[slug];
    return {
      id: project.id,
      name: project.name,
      slug,
      workspaceTitle: workspace.title,
      updatedAt: project.updatedAt,
    };
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#04060d] via-[#080c1a] to-[#05060a] text-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-[-10%] h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-32 left-[-10%] h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
      </div>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-40" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 py-12 sm:px-10 sm:py-16">
        <nav className="flex items-center justify-between text-sm text-white/60">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-medium text-white/80 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
              <svg viewBox="0 0 20 20" aria-hidden className="h-3.5 w-3.5">
                <path
                  d="M11.75 5.75 8 9.5l3.75 3.75"
                  className="fill-none stroke-current stroke-[1.5]"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Back to home
          </Link>
          <span className="hidden items-center gap-2 uppercase tracking-[0.3em] text-white/40 sm:inline-flex">
            <span className="h-1 w-1 rounded-full bg-emerald-300" aria-hidden />
            Yentic IDE
          </span>
        </nav>

        <header className="flex flex-col gap-6 text-center sm:gap-8">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden />
            Launch your stack
          </div>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Pick a workspace that matches your flow
          </h1>
          <p className="mx-auto max-w-2xl text-base text-white/70 sm:text-lg">
            Each workspace is pre-tuned with starter files, runtime defaults, and UI accents that mirror the marketing experience.
            Choose a language to dive straight into building.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {highlights.map(highlight => (
              <span
                key={highlight}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/60"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/70" aria-hidden />
                {highlight}
              </span>
            ))}
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspaceList.map(workspace => {
            const icon = languageIcons[workspace.slug] ?? defaultIcon;
            const gradient = accentGradient[workspace.accent] ?? accentGradient.emerald;
            const glow = accentGlow[workspace.accent] ?? accentGlow.emerald;
            return (
              <Link
                key={workspace.slug}
                href={`/ide/${workspace.slug}?new=1`}
                className={`group relative flex min-h-[220px] flex-col gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition duration-300 hover:-translate-y-1.5 hover:border-white/20 hover:bg-white/10 ${glow}`}
              >
                <div
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
                </div>
                <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-black/40 text-white shadow-lg shadow-black/20 transition duration-300 group-hover:scale-105">
                  {icon}
                </span>
                <div className="relative flex flex-col gap-1 text-left">
                  <h2 className="text-lg font-semibold text-white">{workspace.title}</h2>
                  <p className="text-sm text-white/60">{workspace.description}</p>
                </div>
                <div className="relative mt-auto flex items-center justify-between pt-2 text-sm font-semibold text-emerald-200">
                  <span className="inline-flex items-center gap-2">
                    Open workspace
                    <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </span>
                  <span className="text-[0.7rem] uppercase tracking-[0.25em] text-white/40">Ready</span>
                </div>
              </Link>
            );
          })}
        </section>

        <section
          id="saved-projects"
          className="rounded-3xl border border-white/10 bg-black/35 p-6 sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-white">Saved projects</h2>
              <p className="text-sm text-white/60">
                Cloud saves bundle every file in your workspace so you can reload an entire project instantly.
              </p>
            </div>
            {session?.user ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                {savedProjectCards.length} saved
              </span>
            ) : (
              <Link
                href="/api/auth/signin"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
              >
                Sign in to sync
              </Link>
            )}
          </div>

          {session?.user ? (
            savedProjectCards.length ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {savedProjectCards.map(project => (
                  <Link
                    key={project.id}
                    href={`/ide/${project.slug}?projectId=${project.id}`}
                    className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-black/50"
                  >
                    <div className="space-y-2">
                      <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/40">
                        Cloud project
                      </span>
                      <h3 className="truncate text-lg font-semibold text-white">{project.name}</h3>
                      <p className="text-xs text-white/50">
                        Updated {formatTimeAgo(project.updatedAt)} · {project.workspaceTitle}
                      </p>
                    </div>
                    <div className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-emerald-200">
                      Resume in {project.workspaceTitle}
                      <span aria-hidden className="transition group-hover:translate-x-1">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-white/60">
                No saved projects yet—create a project and we&apos;ll store the entire workspace here.
              </div>
            )
          ) : (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
              Sign in to see cloud projects that bundle all of your files together.
            </div>
          )}
        </section>

        <footer className="flex flex-col items-center gap-4 pb-6 text-center text-xs text-white/50 sm:flex-row sm:justify-between sm:text-left">
          <p>
            Need another language? Let us know at{' '}
            <a className="text-emerald-200 underline decoration-emerald-400/60 underline-offset-4" href="mailto:hello@yentic.com">
              hello@yentic.com
            </a>
            .
          </p>
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[0.7rem] uppercase tracking-[0.3em] text-white/40">
            <span className="h-1 w-1 rounded-full bg-emerald-300" aria-hidden />
            Always a click away
          </div>
        </footer>
      </div>
    </div>
  );
}
