'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';

import AuthStatus from '@/components/AuthStatus';
import { AnimateIn } from '@/components/ui/AnimateIn';
import { workspaceList, type WorkspaceSlug } from '@/lib/project';

const workflowSteps = [
  {
    step: '01',
    title: 'Open and start coding',
    body: 'Pick a runtime and jump into a real project immediately.',
  },
  {
    step: '02',
    title: 'Edit with full context',
    body: 'Use Monaco, tabbed files, and quick keyboard navigation.',
  },
  {
    step: '03',
    title: 'Validate and keep moving',
    body: 'Preview changes live and resume work from saved projects later.',
  },
];

const detailRows = [
  { label: 'Editor', value: 'Monaco, tabs, shortcuts, and quick file workflow.' },
  { label: 'Preview', value: 'Live updates while code changes are still in progress.' },
  { label: 'Runtime', value: 'Web, Python, C, C++, and Java workspaces in one launcher.' },
  { label: 'History', value: 'Project state persists so you can reopen exactly where you left off.' },
];

const planningCards = [
  { stage: 'Now', notes: 'Core editing, preview, and saved project flow are stable.' },
  { stage: 'Next', notes: 'Cleaner project controls and easier personal organization.' },
  { stage: 'Later', notes: 'Simple publish and share options for finished projects.' },
];

const workspaceTint: Record<WorkspaceSlug, string> = {
  web: 'from-emerald-300/25 to-transparent',
  python: 'from-cyan-300/25 to-transparent',
  c: 'from-orange-300/25 to-transparent',
  cpp: 'from-amber-300/25 to-transparent',
  java: 'from-sky-300/25 to-transparent',
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

function LandingHome() {
  return (
    <div className="flex flex-col gap-24">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.55] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />

        {/* Glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full bg-[var(--color-accent)]/[0.12] blur-[120px]" />

        <div className="relative mx-auto flex w-full max-w-[920px] flex-col items-center px-6 pb-14 pt-24 text-center sm:pb-20 sm:pt-32">
          <motion.span
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0 }}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/70"
          >
            Yentic IDE
          </motion.span>

          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-6 max-w-[700px] text-display text-white"
          >
            Build and iterate from one browser workspace.
          </motion.h1>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-5 max-w-[620px] text-base leading-relaxed text-white/65 sm:text-lg"
          >
            A lightweight and fast web IDE that feels instantly familiar.
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/ide"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-200 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]"
            >
              Open IDE
            </Link>
            <Link
              href="/features"
              className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white/40"
            >
              Product details
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Workflow */}
      <AnimateIn>
        <section className="relative overflow-hidden rounded-[10px] border border-[var(--color-light-border)] bg-[var(--color-light-bg)] text-[var(--color-light-text)]">
          <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(19,25,35,0.11)_1px,transparent_1px)] [background-size:26px_26px]" />

          <div className="relative border-b border-[var(--color-light-border)] px-6 py-10 sm:px-8 sm:py-12">
            <div className="max-w-[760px]">
              <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[var(--color-light-muted)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-light-muted)]" />
                Workflow
              </p>
              <h2 className="mt-4 text-title text-[var(--color-light-text-heading)]">
                Write, preview, and ship from one place.
              </h2>
            </div>
          </div>

          <div className="relative grid md:grid-cols-3">
            {workflowSteps.map((item, index) => (
              <article
                key={item.title}
                className={`px-6 py-7 sm:px-8 sm:py-8 ${index < workflowSteps.length - 1 ? 'border-b border-[var(--color-light-border)] md:border-b-0 md:border-r' : ''}`}
              >
                <p className="text-[12px] font-medium text-[#4f5d6f]">{item.step}</p>
                <h3 className="mt-3 text-heading text-[#101a27]">{item.title}</h3>
                <p className="mt-3 max-w-[34ch] text-[14px] leading-[1.6] text-[var(--color-light-text-body)]">{item.body}</p>
              </article>
            ))}
          </div>
        </section>
      </AnimateIn>

      {/* Product details */}
      <AnimateIn delay={0.1}>
        <section className="relative overflow-hidden rounded-[10px] border border-[var(--color-border-medium)] bg-[var(--color-bg-overlay)]">
          <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_20%_0%,rgba(220,229,240,0.2),transparent_48%),linear-gradient(to_right,rgba(220,229,240,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(220,229,240,0.08)_1px,transparent_1px)] [background-size:auto,48px_48px,48px_48px]" />

          <div className="relative lg:grid lg:grid-cols-[1.2fr_0.8fr]">
            <div className="border-b border-[var(--color-border-medium)] px-6 py-9 sm:px-8 sm:py-10 lg:border-b-0 lg:border-r">
              <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-text-muted)]" />
                Product
              </p>
              <h2 className="mt-4 max-w-[660px] text-title text-[var(--color-text-primary)]">
                What you get.
              </h2>
              <p className="mt-4 max-w-[58ch] text-body-prose text-[var(--color-text-secondary)]">
                A Monaco-based editor, live preview, and multi-language runtimes in the browser.
              </p>

              <div className="mt-8 overflow-hidden rounded-lg border border-[var(--color-border-medium)] bg-[#141b25]">
                {detailRows.map((item) => (
                  <div
                    key={item.label}
                    className="grid gap-2 border-b border-[var(--color-border-medium)] px-5 py-4 last:border-b-0 sm:grid-cols-[104px_minmax(0,1fr)] sm:gap-4"
                  >
                    <p className="text-[12px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{item.label}</p>
                    <p className="text-[14px] leading-[1.55] text-[#d3dfee]">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/ide"
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-200 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                >
                  Open IDE
                </Link>
                <Link
                  href="/features"
                  className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white/40"
                >
                  Product details
                </Link>
              </div>
            </div>

            <div className="px-6 py-9 sm:px-8 sm:py-10">
              <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-text-muted)]" />
                Release track
              </p>
              <div className="mt-5 overflow-hidden rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-surface)]">
                {planningCards.map((item) => (
                  <article key={item.stage} className="border-b border-[var(--color-border-medium)] px-5 py-5 last:border-b-0">
                    <p className="text-[12px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{item.stage}</p>
                    <p className="mt-2 text-[14px] leading-[1.55] text-[#c6d4e4]">{item.notes}</p>
                  </article>
                ))}
              </div>

              <p className="mt-6 text-[13px] leading-[1.6] text-[var(--color-text-faint)]">
                Autosave and multiplayer are next up.
              </p>
            </div>
          </div>
        </section>
      </AnimateIn>
    </div>
  );
}

function AuthenticatedHome({ userName }: { userName: string }) {
  const firstName = userName.split(' ')[0] ?? 'there';

  return (
    <div className="flex flex-col gap-14">
      <section className="relative overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-8 sm:p-10">
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/70">
              Welcome back
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.03em] text-white">
              {firstName}, continue building.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">
              Start a new project or reopen a saved one.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/ide"
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-200 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]"
              >
                New project
              </Link>
              <Link
                href="/ide#saved-projects"
                className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white/40"
              >
                Saved projects
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-border-subtle)] bg-black/35 p-4">
            <AuthStatus />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-white">Choose a workspace</h2>
            <p className="mt-1 text-sm text-white/65">Open a runtime and start coding.</p>
          </div>
          <Link
            href="/ide"
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/75 transition hover:border-white/40"
          >
            Browse all
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspaceList.map((workspace) => (
            <Link
              key={workspace.slug}
              href={`/ide/${workspace.slug}`}
              className="group overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] transition hover:border-white/25 hover:-translate-y-1 hover:shadow-[0_0_24px_rgba(16,185,129,0.1)]"
            >
              <div className={`h-28 border-b border-[var(--color-border-subtle)] bg-gradient-to-br ${workspaceTint[workspace.slug]}`} />
              <div className="space-y-3 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">Workspace</p>
                <h3 className="text-lg font-semibold text-white">{workspace.title}</h3>
                <p className="text-sm leading-relaxed text-white/65">{workspace.description}</p>
                <p className="text-sm font-semibold text-white/90">
                  Create project <span aria-hidden>→</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();

  if (status !== 'authenticated' || !session?.user) {
    return <LandingHome />;
  }

  const displayName = session.user.name ?? session.user.email ?? 'there';
  return <AuthenticatedHome userName={displayName} />;
}
