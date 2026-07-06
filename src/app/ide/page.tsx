import Link from 'next/link';
import type { ReactNode } from 'react';
import { workspaceList } from '@/lib/project';

const languageIcons: Record<string, ReactNode> = {
  web: (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
      <circle cx="12" cy="12" r="9" className="fill-current opacity-20" />
      <path
        d="M3 12h18m-9-9c3 4.5 3 13.5 0 18m6-18c2.25 4.5 2.25 13.5 0 18"
        className="fill-none stroke-current stroke-[1.5]"
      />
    </svg>
  ),
  python: (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
      <path
        d="M11.5 3h1.75a3.75 3.75 0 0 1 3.75 3.75V9H9.5A2.5 2.5 0 0 0 7 11.5v1A3.5 3.5 0 0 1 3.5 16v-5.25A3.75 3.75 0 0 1 7.25 7h2.25V6.75A3.75 3.75 0 0 1 11.5 3Z"
        className="fill-current opacity-80"
      />
      <path
        d="M12.5 21h-1.75A3.75 3.75 0 0 1 7 17.25V15h7.5A2.5 2.5 0 0 0 17 12.5v-1A3.5 3.5 0 0 1 20.5 8v5.25A3.75 3.75 0 0 1 16.75 17H14v.25A3.75 3.75 0 0 1 12.5 21Z"
        className="fill-current opacity-50"
      />
    </svg>
  ),
  c: (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
      <path
        d="M12 4.75c1.74 0 3.31.7 4.45 1.83l1.8-1.8A9 9 0 1 0 12 21a8.97 8.97 0 0 0 6.24-2.5l-1.77-1.78A6.5 6.5 0 1 1 12 5.5"
        className="fill-none stroke-current stroke-[1.6]"
      />
    </svg>
  ),
  cpp: (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
      <circle cx="12" cy="12" r="8" className="fill-none stroke-current stroke-[1.4] opacity-60" />
      <path d="M10 12h4" className="fill-none stroke-current stroke-[1.4]" strokeLinecap="round" />
      <path d="M12 10v4" className="fill-none stroke-current stroke-[1.4]" strokeLinecap="round" />
      <path d="M6.5 12a5.5 5.5 0 0 1 5.5-5.5" className="fill-none stroke-current stroke-[1.4] opacity-40" />
      <path d="M17.5 12a5.5 5.5 0 0 1-5.5 5.5" className="fill-none stroke-current stroke-[1.4] opacity-40" />
    </svg>
  ),
  java: (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
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
  <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
    <rect x="4" y="4" width="16" height="16" rx="3" className="fill-none stroke-current stroke-[1.5]" />
    <path d="M9 8h6m-6 4h6m-6 4h3" className="fill-none stroke-current stroke-[1.5]" />
  </svg>
);

const highlights = ['Live Sandpack preview', 'Runtime and console streaming', 'Instant project scaffolding'];

export default function WorkspacePicker() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--y-ink)', color: 'var(--y-fg)' }}>
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-6 py-10 sm:px-8 sm:py-12">
        <nav className="flex items-center justify-between font-[family-name:var(--font-mono-code)] text-sm" style={{ color: 'var(--y-muted)' }}>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-medium transition"
            style={{ borderColor: 'var(--y-line)', color: 'var(--y-fg)' }}
          >
            ← back to home
          </Link>
          <span className="flex items-center gap-2" style={{ color: 'var(--y-brand)' }}>yentic ide</span>
        </nav>

        {/* hero */}
        <section className="overflow-hidden rounded-[14px] border" style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)' }}>
          <div className="mx-auto flex w-full max-w-[980px] flex-col items-center px-6 pb-14 pt-16 text-center sm:pb-16 sm:pt-20">
            <span
              className="rounded-md border px-3 py-1 font-[family-name:var(--font-mono-code)] text-[11px] font-medium"
              style={{ borderColor: 'var(--y-line)', color: 'var(--y-brand)' }}
            >
              # launch your stack
            </span>
            <h1
              className="mt-6 max-w-[760px] font-[family-name:var(--font-display)] text-[clamp(38px,5vw,54px)] font-extrabold leading-[1.02] tracking-[-0.035em]"
              style={{ color: 'var(--y-fg)' }}
            >
              Pick a workspace.
            </h1>
            <p className="mt-5 max-w-[700px] text-[15px] leading-relaxed sm:text-lg" style={{ color: 'var(--y-muted)' }}>
              Each workspace includes starter files and a configured runtime. Pick one and start coding.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              {highlights.map((highlight) => (
                <span
                  key={highlight}
                  className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-[family-name:var(--font-mono-code)] text-xs"
                  style={{ borderColor: 'var(--y-line)', color: 'var(--y-muted)' }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--y-brand)' }} aria-hidden />
                  {highlight}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* workspaces grid */}
        <section className="overflow-hidden rounded-[12px] border" style={{ borderColor: 'var(--y-line)', background: 'var(--y-ink)' }}>
          <div className="border-b px-6 py-7 sm:px-8" style={{ borderColor: 'var(--y-line)' }}>
            <p className="font-[family-name:var(--font-mono-code)] text-[12.5px]" style={{ color: 'var(--y-brand)' }}>
              # workspaces
            </p>
            <h2
              className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.02em]"
              style={{ color: 'var(--y-fg)' }}
            >
              Available workspaces.
            </h2>
          </div>

          <div className="grid gap-px md:grid-cols-2 xl:grid-cols-3" style={{ background: 'var(--y-line)' }}>
            {workspaceList.map((workspace) => {
              const icon = languageIcons[workspace.slug] ?? defaultIcon;

              return (
                <Link
                  key={workspace.slug}
                  href={`/ide/${workspace.slug}`}
                  className="group flex min-h-[210px] flex-col gap-4 px-6 py-7 transition sm:px-8"
                  style={{ background: 'var(--y-ink)' }}
                >
                  <span
                    className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border transition group-hover:scale-105"
                    style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)', color: 'var(--y-brand)' }}
                  >
                    {icon}
                  </span>
                  <div className="flex flex-col gap-1 text-left">
                    <h3
                      className="font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.02em]"
                      style={{ color: 'var(--y-fg)' }}
                    >
                      {workspace.title}
                    </h3>
                    <p className="text-sm leading-[1.55]" style={{ color: 'var(--y-muted)' }}>
                      {workspace.description}
                    </p>
                  </div>
                  <div
                    className="mt-auto flex items-center justify-between pt-2 font-[family-name:var(--font-mono-code)] text-sm font-semibold"
                    style={{ color: 'var(--y-brand)' }}
                  >
                    <span className="inline-flex items-center gap-2">
                      open workspace
                      <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                    </span>
                  </div>
                </Link>
              );
            })}

            {/* fills the trailing grid cell + a real CTA */}
            <a
              href="mailto:hello@yentic.com?subject=Language%20request"
              className="group flex min-h-[210px] flex-col justify-center gap-2 px-6 py-7 text-center sm:px-8"
              style={{ background: 'var(--y-ink)', color: 'var(--y-muted)' }}
            >
              <p className="font-[family-name:var(--font-display)] text-lg font-bold" style={{ color: 'var(--y-fg)' }}>
                Need another language?
              </p>
              <p className="text-sm leading-[1.55]">
                Tell us what to add — <span style={{ color: 'var(--y-brand)' }}>hello@yentic.com</span>
              </p>
            </a>
          </div>
        </section>

        <footer
          className="flex flex-col items-center gap-4 pb-6 text-center font-[family-name:var(--font-mono-code)] text-xs sm:flex-row sm:justify-between sm:text-left"
          style={{ color: 'var(--y-muted)' }}
        >
          <p>
            Need another language? Let us know at{' '}
            <a className="underline underline-offset-4" style={{ color: 'var(--y-brand)' }} href="mailto:hello@yentic.com">
              hello@yentic.com
            </a>
            .
          </p>
          <span style={{ color: 'var(--y-brand)' }}>yentic ide</span>
        </footer>
      </div>
    </div>
  );
}
