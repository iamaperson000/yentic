'use client';

import Link from 'next/link';
import { Code2, Eye, Users } from 'lucide-react';
import { AnimateIn } from '@/components/ui/AnimateIn';

const featureGroups = [
  {
    title: 'Core editing',
    icon: Code2,
    description: 'Monaco editor with multi-file tabs, syntax highlighting, and inline errors.',
    bullets: [
      'Command palette for quick file switching and actions (⌘K / Ctrl+K).',
      'Language-aware scaffolds and syntax highlighting for HTML, CSS, JS, and TS.',
      'In-editor formatting powered by Prettier presets (coming soon).'
    ]
  },
  {
    title: 'Live feedback',
    icon: Eye,
    description: 'See changes as you type. Sandpack renders your code live in an iframe beside the editor.',
    bullets: [
      'Sandpack preview stays synced with the active file and shares console output.',
      'Hot reload for styles and modules without manual refreshes.',
      'Build logs and error overlays planned for multi-language runtimes.'
    ]
  },
  {
    title: 'Collaboration ready (in development)',
    icon: Users,
    description: 'Real-time collaboration is in development. Here is what we are building toward.',
    bullets: [
      'Presence indicators, follow mode, and cursor streaming on the roadmap.',
      'Invite teammates via share links once authentication rolls out.',
      'Role-based permissions to separate viewers, editors, and owners.'
    ]
  }
];

export default function FeaturesPage() {
  return (
    <div className="flex flex-col gap-16">
      <AnimateIn delay={0}>
        <section className="relative overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="relative max-w-[920px] px-6 py-14 sm:px-8 sm:py-16">
            <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
              <span className="h-2 w-2 rounded-full bg-[var(--color-text-muted)]" />
              Product
            </p>
            <h1 className="mt-4 text-[34px] font-medium leading-[1.05] tracking-[-0.04em] text-[var(--color-text-primary)] sm:text-[48px] lg:text-[56px]">
              Features.
            </h1>
            <p className="mt-4 max-w-[68ch] text-[15px] leading-[1.55] text-[var(--color-text-secondary)]">
              A browser IDE with Monaco, live preview, and multi-language runtimes. No AI assistants, no bloat.
            </p>
          </div>
        </section>
      </AnimateIn>

      <AnimateIn delay={0.1}>
        <section className="relative overflow-hidden rounded-[10px] border border-[#bfc9d6] bg-[var(--color-light-bg)] text-[var(--color-bg-surface)]">
          <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(19,25,35,0.11)_1px,transparent_1px)] [background-size:26px_26px]" />

          <div className="relative border-b border-[var(--color-light-border)] px-6 py-10 sm:px-8 sm:py-12">
            <div className="max-w-[760px]">
              <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[var(--color-light-muted)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-light-muted)]" />
                Capabilities
              </p>
              <h2 className="mt-4 text-[30px] font-medium leading-[1.05] tracking-[-0.04em] text-[#0f1621] sm:text-[40px] lg:text-[48px]">
                What is included today.
              </h2>
            </div>
          </div>

          <div className="relative grid gap-px bg-[var(--color-light-border)] md:grid-cols-3">
            {featureGroups.map(group => (
              <section key={group.title} className="bg-[var(--color-light-bg)] px-6 py-7 sm:px-8 sm:py-8">
                <h3 className="flex items-center gap-2 text-[22px] font-medium leading-[1.2] tracking-[-0.02em] text-[#101a27]">
                  <group.icon size={20} className="text-[var(--color-text-muted)]" />
                  {group.title}
                </h3>
                <p className="mt-3 text-[14px] leading-[1.6] text-[#273446]/85">{group.description}</p>
                <ul className="mt-5 space-y-3 text-[14px] leading-[1.55] text-[#253243]">
                  {group.bullets.map(item => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-[8px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--color-light-muted)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      </AnimateIn>

      <AnimateIn delay={0.2}>
        <section className="relative overflow-hidden rounded-[10px] border border-[#2d3643] bg-[var(--color-bg-overlay)]">
          <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(to_right,rgba(220,229,240,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(220,229,240,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="relative flex flex-col gap-6 px-6 py-10 sm:px-8 sm:py-12 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[62ch]">
              <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-text-muted)]" />
                Coming next
              </p>
              <h2 className="mt-4 text-[30px] font-medium leading-[1.05] tracking-[-0.04em] text-[var(--color-text-primary)] sm:text-[40px]">
                What is coming next.
              </h2>
              <p className="mt-4 text-[15px] leading-[1.55] text-[var(--color-text-secondary)]">
                Server-backed autosave, multiplayer cursors, and first-class support for Python, Rust, and Go builds are in active
                development.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/roadmap"
                className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white/40"
              >
                View roadmap
              </Link>
              <Link href="/signup" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-200">
                Get early access
              </Link>
            </div>
          </div>
        </section>
      </AnimateIn>
    </div>
  );
}
