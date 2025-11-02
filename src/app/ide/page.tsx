'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { workspaceList } from '@/lib/project';

const accentMap: Record<string, string> = {
  emerald: 'from-emerald-400/20 via-emerald-400/10 to-emerald-500/5 text-emerald-200',
  sky: 'from-sky-400/20 via-sky-400/10 to-sky-500/5 text-sky-200',
  violet: 'from-violet-400/20 via-violet-400/10 to-violet-500/5 text-violet-200',
  amber: 'from-amber-400/25 via-amber-400/10 to-amber-500/5 text-amber-100'
};

export default function WorkspacePicker() {
  const [query, setQuery] = useState('');
  const [selectedSlug, setSelectedSlug] = useState<string>(workspaceList[0]?.slug ?? 'web');

  const normalizedQuery = query.trim().toLowerCase();
  const filteredWorkspaces = useMemo(() => {
    if (!normalizedQuery) return workspaceList;
    return workspaceList.filter(workspace => {
      const haystack = `${workspace.title} ${workspace.description}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery]);

  const selectedWorkspace = useMemo(() => {
    return workspaceList.find(workspace => workspace.slug === selectedSlug) ?? workspaceList[0];
  }, [selectedSlug]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#05060f] via-[#050414] to-[#02030a] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(120,119,198,0.22),_transparent_58%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.14),_transparent_60%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-14 px-6 py-20">
        <header className="flex flex-col gap-4 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/50">
            Yentic Workspaces
          </div>
          <h1 className="text-4xl font-semibold sm:text-5xl">Choose your starting language</h1>
          <p className="mx-auto max-w-2xl text-base text-white/70 sm:text-lg">
            Filter the catalog or pick from the dropdown to explore each workspace&apos;s tailored starter files and tooling.
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-[0_40px_120px_rgba(10,18,41,0.45)] backdrop-blur-xl">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/40">
                Quick start
              </span>
              <h2 className="text-2xl font-semibold">Preview a workspace</h2>
              <p className="text-sm text-white/65">
                Select a language to see what&apos;s included before you launch into the editor.
              </p>
            </div>

            <label className="block text-left">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">Language</span>
              <div className="relative mt-2">
                <select
                  value={selectedSlug}
                  onChange={event => setSelectedSlug(event.target.value)}
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white focus:border-emerald-300/70 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                >
                  {workspaceList.map(workspace => (
                    <option key={workspace.slug} value={workspace.slug} className="bg-[#05060f] text-white">
                      {workspace.title}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-white/40">▾</span>
              </div>
            </label>

            {selectedWorkspace ? (
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_30px_80px_rgba(10,18,41,0.5)]">
                <div
                  className={`pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br ${
                    accentMap[selectedWorkspace.accent] ?? 'from-white/10 to-white/0'
                  } blur-3xl opacity-70`}
                />
                <div className="relative space-y-4">
                  <div className="space-y-2">
                    <span className="text-sm font-semibold uppercase tracking-[0.3em] text-white/40">
                      {selectedWorkspace.title}
                    </span>
                    <h3 className="text-2xl font-semibold text-white">{selectedWorkspace.title}</h3>
                    <p className="text-sm text-white/70">{selectedWorkspace.description}</p>
                  </div>
                  <Link
                    href={`/ide/${selectedWorkspace.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-400/70 bg-emerald-400/90 px-5 py-2 text-sm font-semibold text-slate-950 shadow-[0_15px_45px_rgba(16,185,129,0.35)] transition hover:bg-emerald-300"
                  >
                    Launch workspace
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            ) : null}
          </section>

          <section className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.02] p-8 shadow-[0_40px_120px_rgba(10,18,41,0.35)] backdrop-blur-lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">All workspaces</h2>
                <p className="text-sm text-white/55">Search or skim the list—hover any entry to preview it on the left.</p>
              </div>
              <div className="relative w-full max-w-xs">
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search languages"
                  className="w-full rounded-full border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-emerald-300/60 focus:outline-none"
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-white/40">⌕</span>
              </div>
            </div>

            <div className="custom-scrollbar max-h-[520px] space-y-4 overflow-y-auto pr-2">
              {filteredWorkspaces.length ? (
                filteredWorkspaces.map(workspace => {
                  const isSelected = workspace.slug === selectedSlug;
                  return (
                    <div
                      key={workspace.slug}
                      className={
                        'relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-5 transition hover:border-white/20 hover:bg-white/[0.08]'
                      }
                      onMouseEnter={() => setSelectedSlug(workspace.slug)}
                    >
                      <div
                        className={`pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-gradient-to-br ${
                          accentMap[workspace.accent] ?? 'from-white/10 to-white/0'
                        } blur-3xl opacity-60`}
                      />
                      <div className="relative flex flex-col gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
                            <span>{workspace.title}</span>
                            {isSelected ? (
                              <span className="inline-flex items-center rounded-full border border-emerald-300/60 bg-emerald-300/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                                Selected
                              </span>
                            ) : null}
                          </div>
                          <p className="text-sm text-white/70">{workspace.description}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedSlug(workspace.slug)}
                            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1.5 text-xs text-white/70 transition hover:border-white/35 hover:text-white"
                          >
                            Preview details
                          </button>
                          <Link
                            href={`/ide/${workspace.slug}`}
                            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-400/90 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition hover:bg-emerald-300"
                          >
                            Open
                            <span aria-hidden>→</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-3xl border border-white/10 bg-black/40 px-6 py-10 text-center text-sm text-white/60">
                  No workspaces match that search just yet. Try a different keyword or reach out at{' '}
                  <a className="text-emerald-200 underline decoration-emerald-300/60 underline-offset-4" href="mailto:hello@yentic.com">
                    hello@yentic.com
                  </a>
                  .
                </div>
              )}
            </div>
          </section>
        </div>

        <p className="text-center text-xs text-white/40">
          More languages are on the way. Let us know what you want to build: <a className="text-emerald-200 underline decoration-emerald-300/60 underline-offset-4" href="mailto:hello@yentic.com">hello@yentic.com</a>.
        </p>
      </div>
    </div>
  );
}
