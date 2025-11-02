import Link from 'next/link';

import { workspaceList } from '@/lib/project';

const accentTokens: Record<
  string,
  {
    glow: string;
    chip: string;
    cta: string;
    hover: string;
  }
> = {
  emerald: {
    glow: 'from-emerald-400/30 via-emerald-500/10 to-transparent',
    chip: 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200',
    cta: 'text-emerald-200',
    hover: 'hover:border-emerald-400/60'
  },
  sky: {
    glow: 'from-sky-400/30 via-sky-500/10 to-transparent',
    chip: 'border-sky-400/50 bg-sky-400/10 text-sky-200',
    cta: 'text-sky-200',
    hover: 'hover:border-sky-400/60'
  },
  violet: {
    glow: 'from-violet-400/30 via-violet-500/10 to-transparent',
    chip: 'border-violet-400/50 bg-violet-400/10 text-violet-200',
    cta: 'text-violet-200',
    hover: 'hover:border-violet-400/60'
  },
  amber: {
    glow: 'from-amber-400/30 via-amber-500/10 to-transparent',
    chip: 'border-amber-400/50 bg-amber-400/10 text-amber-100',
    cta: 'text-amber-100',
    hover: 'hover:border-amber-400/60'
  }
};

const highlights = [
  {
    title: 'Smart scaffolding',
    description: 'Language-aware starters and instant file creation tuned to each stack.'
  },
  {
    title: 'Expanded workspace',
    description: 'Layouts stretch across large displays without sacrificing smaller breakpoints.'
  },
  {
    title: 'Unified polish',
    description: 'Consistent typography, spacing, and hover states across the IDE family.'
  }
];

export default function WorkspacePicker() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent" />
      <div className="pointer-events-none absolute -left-32 top-24 h-[480px] w-[480px] rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-[420px] w-[420px] rounded-full bg-sky-400/10 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-6 pb-20 pt-16 lg:px-10">
        <header className="flex flex-col gap-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
              Yentic Workspaces
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-400/60 hover:text-emerald-200"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/90 text-sm font-semibold text-slate-950 shadow-[0_8px_24px_rgba(16,185,129,0.35)]">
                Y
              </span>
              Back to home
            </Link>
          </div>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-end">
            <div className="space-y-6">
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold sm:text-5xl">Choose your starting language</h1>
                <p className="max-w-2xl text-base text-slate-400 sm:text-lg">
                  Pick the stack you want to explore. Your workspace, starter files, and preview tooling adjust instantly to match the language you launch.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {highlights.map(item => (
                  <div key={item.title} className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">{item.title}</p>
                    <p className="mt-2 text-sm text-slate-400">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-3xl border border-slate-800/80 bg-slate-950/60 p-6 text-sm text-slate-400">
              <p className="text-slate-300">
                All workspaces share the same modern chrome, responsive tri-panel layout, and streamlined file creation. Jump in wherever you feel most at home.
              </p>
              <p>
                Prefer another language? Drop us a note and we&apos;ll line it up next.
              </p>
              <a
                className="inline-flex w-max items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-400/70 hover:text-emerald-50"
                href="mailto:hello@yentic.com"
              >
                hello@yentic.com
                <span aria-hidden className="text-base leading-none">↗</span>
              </a>
            </div>
          </div>
        </header>
        <main className="mt-12 flex-1">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {workspaceList.map(workspace => {
              const accent = accentTokens[workspace.accent] ?? {
                glow: 'from-slate-400/30 via-slate-500/10 to-transparent',
                chip: 'border-slate-400/50 bg-slate-500/10 text-slate-200',
                cta: 'text-slate-200',
                hover: 'hover:border-slate-400/60'
              };
              const slugLabel = workspace.slug.toUpperCase();

              return (
                <Link
                  key={workspace.slug}
                  href={`/ide/${workspace.slug}`}
                  className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950/70 p-8 transition-all duration-300 hover:-translate-y-1 hover:bg-slate-950/80 ${accent.hover}`}
                >
                  <div
                    className={`pointer-events-none absolute -left-16 top-16 h-40 w-40 rounded-full bg-gradient-to-br ${accent.glow} opacity-60 blur-3xl transition group-hover:opacity-100`}
                    aria-hidden
                  />
                  <div className="relative flex h-full flex-col gap-6">
                    <div className="inline-flex w-max">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] ${accent.chip}`}
                      >
                        {slugLabel}
                      </span>
                    </div>
                    <div className="space-y-3">
                      <h2 className="text-2xl font-semibold text-slate-100">{workspace.title}</h2>
                      <p className="text-sm leading-relaxed text-slate-400">{workspace.description}</p>
                    </div>
                    <div className={`mt-auto inline-flex items-center gap-2 text-sm font-semibold transition ${accent.cta}`}>
                      Enter workspace
                      <span aria-hidden className="transition group-hover:translate-x-1">→</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
