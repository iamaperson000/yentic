import Link from 'next/link';

import { workspaceList } from '@/lib/project';

const accentMap: Record<string, string> = {
  emerald: 'from-emerald-400/20 to-emerald-500/5 text-emerald-200',
  sky: 'from-sky-400/20 to-sky-500/5 text-sky-200',
  violet: 'from-violet-400/20 to-violet-500/5 text-violet-200',
  amber: 'from-amber-400/25 to-amber-500/5 text-amber-100'
};

export default function WorkspacePicker() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#05060f] via-[#050414] to-[#02030a] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(120,119,198,0.22),_transparent_58%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.14),_transparent_60%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 py-20">
        <header className="flex flex-col gap-4 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/50">
            Yentic Workspaces
          </div>
          <h1 className="text-4xl font-semibold sm:text-5xl">Choose your starting language</h1>
          <p className="mx-auto max-w-2xl text-base text-white/70 sm:text-lg">
            Pick the stack you want to explore. We&apos;ll tailor the workspace, starter files, and preview tools to match.
          </p>
        </header>
        <div className="grid gap-6 md:grid-cols-2">
          {workspaceList.map(workspace => {
            const accent = accentMap[workspace.accent] ?? 'from-white/10 to-white/0 text-white/80';
            return (
              <Link
                key={workspace.slug}
                href={`/ide/${workspace.slug}`}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-[0_40px_120px_rgba(10,18,41,0.45)] transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                <div
                  className={`absolute -right-14 -top-14 h-40 w-40 rounded-full bg-gradient-to-br ${accent} blur-3xl opacity-60 transition group-hover:opacity-100`}
                />
                <div className="relative flex h-full flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-semibold uppercase tracking-[0.3em] text-white/40">{workspace.title}</span>
                    <h2 className="text-2xl font-semibold text-white">{workspace.title}</h2>
                    <p className="text-sm text-white/70">{workspace.description}</p>
                  </div>
                  <div className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-emerald-200">
                    Enter workspace
                    <span aria-hidden className="transition group-hover:translate-x-1">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        <p className="text-center text-xs text-white/40">
          More languages are on the way. Let us know what you want to build:{' '}
          <a className="text-emerald-200 underline decoration-emerald-300/60 underline-offset-4" href="mailto:hello@yentic.com">
            hello@yentic.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}
