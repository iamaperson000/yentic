import Link from 'next/link';
import type { ReactNode } from 'react';
import { workspaceList } from '@/lib/project';

const languageIcons: Record<string, ReactNode> = {
  web: (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 text-[#c6d4e4]">
      <circle cx="12" cy="12" r="9" className="fill-current opacity-20" />
      <path
        d="M3 12h18m-9-9c3 4.5 3 13.5 0 18m6-18c2.25 4.5 2.25 13.5 0 18"
        className="fill-none stroke-current stroke-[1.5]"
      />
    </svg>
  ),
  python: (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 text-[var(--color-text-secondary)]">
      <path
        d="M11.5 3h1.75a3.75 3.75 0 0 1 3.75 3.75V9H9.5A2.5 2.5 0 0 0 7 11.5v1A3.5 3.5 0 0 1 3.5 16v-5.25A3.75 3.75 0 0 1 7.25 7h2.25V6.75A3.75 3.75 0 0 1 11.5 3Z"
        className="fill-current opacity-80"
      />
      <path
        d="M12.5 21h-1.75A3.75 3.75 0 0 1 7 17.25V15h7.5A2.5 2.5 0 0 0 17 12.5v-1A3.5 3.5 0 0 1 20.5 8v5.25A3.75 3.75 0 0 1 16.75 17H14v.25A3.75 3.75 0 0 1 12.5 21Z"
        className="fill-current opacity-50"
      />
      <circle cx="10.75" cy="6.5" r="1" className="fill-[#131923]" />
      <circle cx="13.25" cy="17.5" r="1" className="fill-[#131923]" />
    </svg>
  ),
  c: (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 text-[var(--color-text-faint)]">
      <path
        d="M12 4.75c1.74 0 3.31.7 4.45 1.83l1.8-1.8A9 9 0 1 0 12 21a8.97 8.97 0 0 0 6.24-2.5l-1.77-1.78A6.5 6.5 0 1 1 12 5.5"
        className="fill-none stroke-current stroke-[1.6]"
      />
    </svg>
  ),
  cpp: (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 text-[var(--color-text-faint)]">
      <circle cx="12" cy="12" r="8" className="fill-none stroke-current stroke-[1.4] opacity-60" />
      <path d="M10 12h4" className="fill-none stroke-current stroke-[1.4]" strokeLinecap="round" />
      <path d="M12 10v4" className="fill-none stroke-current stroke-[1.4]" strokeLinecap="round" />
      <path d="M6.5 12a5.5 5.5 0 0 1 5.5-5.5" className="fill-none stroke-current stroke-[1.4] opacity-40" />
      <path d="M17.5 12a5.5 5.5 0 0 1-5.5 5.5" className="fill-none stroke-current stroke-[1.4] opacity-40" />
    </svg>
  ),
  java: (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 text-[#c6d4e4]">
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

const workspaceTint: Record<string, string> = {
  web: 'from-[#c6d4e4]/25 to-transparent',
  python: 'from-[var(--color-text-secondary)]/25 to-transparent',
  c: 'from-[var(--color-text-faint)]/25 to-transparent',
  cpp: 'from-[var(--color-text-muted)]/25 to-transparent',
  java: 'from-[var(--color-light-bg)]/20 to-transparent'
};

const highlights = ['Live Sandpack preview', 'Runtime and console streaming', 'Instant project scaffolding'];

export default function WorkspacePicker() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-white">
      <div className="mx-auto flex w-full max-w-[1436px] flex-col gap-12 px-6 py-10 sm:px-8 sm:py-12">
        <nav className="flex items-center justify-between text-sm text-white/60">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 font-medium text-white/80 transition hover:border-white/35 hover:bg-white/10 hover:text-white"
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
            Yentic IDE
          </span>
        </nav>

        <section className="relative overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.55] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />

          <div className="relative mx-auto flex w-full max-w-[980px] flex-col items-center px-6 pb-14 pt-16 text-center sm:pb-16 sm:pt-20">
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/70">
              Launch your stack
            </span>

            <h1 className="mt-6 max-w-[760px] text-[38px] font-semibold leading-[1.02] tracking-[-0.04em] text-white sm:text-[54px]">
              Pick a workspace.
            </h1>

            <p className="mt-5 max-w-[700px] text-base leading-relaxed text-white/65 sm:text-lg">
              Each workspace includes starter files and a configured runtime. Pick one and start coding.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              {highlights.map(highlight => (
                <span
                  key={highlight}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white/70"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-text-muted)]" aria-hidden />
                  {highlight}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[10px] border border-[#bfc9d6] bg-[var(--color-light-bg)] text-[#131923]">
          <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(19,25,35,0.11)_1px,transparent_1px)] [background-size:26px_26px]" />

          <div className="relative border-b border-[var(--color-light-border)] px-6 py-10 sm:px-8 sm:py-12">
            <div className="max-w-[760px]">
              <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[var(--color-light-muted)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-light-muted)]" />
                Workspaces
              </p>
              <h2 className="mt-4 text-[30px] font-medium leading-[1.05] tracking-[-0.04em] text-[#0f1621] sm:text-[40px] lg:text-[48px]">
                Available workspaces.
              </h2>
            </div>
          </div>

          <div className="relative grid gap-px bg-[var(--color-light-border)] md:grid-cols-2 xl:grid-cols-3">
            {workspaceList.map(workspace => {
              const icon = languageIcons[workspace.slug] ?? defaultIcon;
              const tint = workspaceTint[workspace.slug] ?? workspaceTint.web;

              return (
                <Link
                  key={workspace.slug}
                  href={`/ide/${workspace.slug}`}
                  className="group relative flex min-h-[220px] flex-col gap-4 bg-[var(--color-light-bg)] px-6 py-7 transition hover:bg-[var(--color-light-bg-hover)] sm:px-8 sm:py-8"
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tint} opacity-30 transition group-hover:opacity-60`} />
                  <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--color-light-border)] bg-[#e7edf5] text-[#1f2c3d] transition duration-300 group-hover:scale-105">
                    {icon}
                  </span>
                  <div className="relative flex flex-col gap-1 text-left">
                    <h3 className="text-[22px] font-medium leading-[1.2] tracking-[-0.02em] text-[#101a27]">{workspace.title}</h3>
                    <p className="text-[14px] leading-[1.55] text-[#273446]/85">{workspace.description}</p>
                  </div>
                  <div className="relative mt-auto flex items-center justify-between pt-2 text-sm font-semibold text-[#1f2c3d]">
                    <span className="inline-flex items-center gap-2">
                      Open workspace
                      <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                    </span>
                    <span className="text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-light-muted)]/80">Ready</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <footer className="flex flex-col items-center gap-4 pb-6 text-center text-xs text-[var(--color-text-faint)] sm:flex-row sm:justify-between sm:text-left">
          <p>
            Need another language? Let us know at{' '}
            <a className="underline decoration-[var(--color-text-muted)] underline-offset-4 transition hover:text-white" href="mailto:hello@yentic.com">
              hello@yentic.com
            </a>
            .
          </p>
          <span className="text-[0.7rem] uppercase tracking-[0.3em] text-[var(--color-text-muted)]">
            Yentic IDE
          </span>
        </footer>
      </div>
    </div>
  );
}
