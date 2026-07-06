'use client';

import Link from 'next/link';
import { Code2, Eye, Users } from 'lucide-react';
import { AnimateIn } from '@/components/ui/AnimateIn';
import PageHero from '@/components/marketing/PageHero';

const featureGroups = [
  {
    title: 'Core editing',
    icon: Code2,
    description: 'Monaco editor with multi-file tabs, syntax highlighting, and inline errors.',
    bullets: [
      'Command palette for quick file switching and actions (⌘K / Ctrl+K).',
      'Language-aware scaffolds and syntax highlighting for HTML, CSS, JS, and TS.',
      'Run Python and web projects in the browser, no install required.'
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
    <div className="flex flex-col gap-14">
      <AnimateIn delay={0}>
        <PageHero
          eyebrow="product"
          title="Features."
          lead="A browser IDE with Monaco, live preview, and runtimes for five languages. Nothing to install."
        />
      </AnimateIn>

      <AnimateIn delay={0.1}>
        <section
          className="overflow-hidden rounded-[12px] border"
          style={{ borderColor: 'var(--y-line)', background: 'var(--y-ink)' }}
        >
          <div className="border-b px-6 py-7 sm:px-8" style={{ borderColor: 'var(--y-line)' }}>
            <p className="font-[family-name:var(--font-mono-code)] text-[12.5px]" style={{ color: 'var(--y-brand)' }}>
              # capabilities
            </p>
            <h2
              className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.02em]"
              style={{ color: 'var(--y-fg)' }}
            >
              What&apos;s included today.
            </h2>
          </div>
          <div className="grid gap-px md:grid-cols-3" style={{ background: 'var(--y-line)' }}>
            {featureGroups.map((group) => (
              <section key={group.title} className="px-6 py-7 sm:px-8" style={{ background: 'var(--y-ink)' }}>
                <h3
                  className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-bold tracking-[-0.02em]"
                  style={{ color: 'var(--y-fg)' }}
                >
                  <group.icon size={18} style={{ color: 'var(--y-fg)' }} />
                  {group.title}
                </h3>
                <p className="mt-3 text-sm leading-[1.6]" style={{ color: 'var(--y-muted)' }}>
                  {group.description}
                </p>
                <ul className="mt-5 space-y-3 text-sm leading-[1.55]" style={{ color: 'var(--y-muted)' }}>
                  {group.bullets.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-[8px] h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: 'var(--y-muted)' }} />
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
        <section
          className="rounded-[12px] border px-6 py-10 sm:px-8"
          style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)' }}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[62ch]">
              <p className="font-[family-name:var(--font-mono-code)] text-[12.5px]" style={{ color: 'var(--y-brand)' }}>
                # coming next
              </p>
              <h2
                className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.02em]"
                style={{ color: 'var(--y-fg)' }}
              >
                What&apos;s coming next.
              </h2>
              <p className="mt-4 text-[15px] leading-[1.6]" style={{ color: 'var(--y-muted)' }}>
                Server-backed autosave, multiplayer cursors, and first-class Python, Rust, and Go builds are in active
                development.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 font-[family-name:var(--font-mono-code)] text-[13px]">
              <Link
                href="/roadmap"
                className="rounded-[9px] border px-5 py-2.5 font-semibold"
                style={{ borderColor: 'var(--y-line)', color: 'var(--y-fg)' }}
              >
                View roadmap
              </Link>
              <Link
                href="/signup"
                className="rounded-[9px] px-5 py-2.5 font-semibold"
                style={{ background: 'var(--y-brand)', color: 'var(--y-statfg)' }}
              >
                Get early access
              </Link>
            </div>
          </div>
        </section>
      </AnimateIn>
    </div>
  );
}
