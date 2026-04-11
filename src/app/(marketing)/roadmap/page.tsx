'use client';

import { site } from '@/config/site';
import { AnimateIn } from '@/components/ui/AnimateIn';

const roadmapPhases = [
  {
    phase: 'Now',
    highlights: [
      'Local-first autosave keeps drafts in the browser so nothing is lost between refreshes.',
      'Starter templates for HTML, CSS, and JavaScript with instant preview synchronization.',
      'Manual share payloads via clipboard while authentication is under construction.'
    ]
  },
  {
    phase: 'Next',
    highlights: [
      'Cloud sync powered by a Supabase Postgres database storing project metadata and file blobs.',
      'Incremental snapshotting so only changed files are sent to the server, ideal for fast autosave.',
      'Authentication via Google or email magic links with workspace-level permissions.'
    ]
  },
  {
    phase: 'Later',
    highlights: [
      'Realtime collaboration with operational transforms streaming through Supabase Realtime channels.',
      'Background build agents for Python, Rust, Go, and more using containerized sandboxes.',
      'Project insights such as activity timelines and restore points.'
    ]
  }
];

const autosavePlan = [
  {
    title: 'Storage model',
    detail:
      'Each project receives a stable UUID. File contents are persisted in Postgres with lightweight metadata and compressed source snapshots. Large assets move to object storage linked from project records.'
  },
  {
    title: 'Sync cadence',
    detail:
      'The client batches edits every few seconds. When no edits occur, it sends a heartbeat to keep the session active. A manual Save now action always forces an immediate snapshot.'
  },
  {
    title: 'Conflict resolution',
    detail:
      'When multiplayer lands, edits merge through operational transforms. Until then, the server keeps the latest snapshot and archives previous versions for safe rollback.'
  }
];

export default function RoadmapPage() {
  return (
    <div className="flex flex-col gap-16">
      <AnimateIn delay={0}>
        <section className="relative overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="relative max-w-[920px] px-6 py-14 sm:px-8 sm:py-16">
            <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
              <span className="h-2 w-2 rounded-full bg-[var(--color-text-muted)]" />
              Roadmap
            </p>
            <h1 className="mt-4 text-[34px] font-medium leading-[1.05] tracking-[-0.04em] text-[var(--color-text-primary)] sm:text-[48px] lg:text-[56px]">
              Where Yentic is headed.
            </h1>
            <p className="mt-4 max-w-[68ch] text-[15px] leading-[1.55] text-[var(--color-text-secondary)]">
              Autosave and multiplayer are the next milestones. After that, server-side execution for more languages.
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
                Delivery phases
              </p>
              <h2 className="mt-4 text-[30px] font-medium leading-[1.05] tracking-[-0.04em] text-[#0f1621] sm:text-[40px] lg:text-[48px]">
                Now, next, and later.
              </h2>
            </div>
          </div>

          <div className="relative grid gap-px bg-[var(--color-light-border)] md:grid-cols-3">
            {roadmapPhases.map(bucket => (
              <section key={bucket.phase} className="bg-[var(--color-light-bg)] px-6 py-7 sm:px-8 sm:py-8">
                <h3 className="text-[22px] font-medium leading-[1.2] tracking-[-0.02em] text-[#101a27]">{bucket.phase}</h3>
                <ul className="mt-5 space-y-3 text-[14px] leading-[1.55] text-[#253243]">
                  {bucket.highlights.map(item => (
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
          <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_20%_0%,rgba(220,229,240,0.2),transparent_48%),linear-gradient(to_right,rgba(220,229,240,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(220,229,240,0.08)_1px,transparent_1px)] [background-size:auto,48px_48px,48px_48px]" />

          <div className="relative lg:grid lg:grid-cols-[1.2fr_0.8fr]">
            <div className="border-b border-[var(--color-border-medium)] px-6 py-9 sm:px-8 sm:py-10 lg:border-b-0 lg:border-r">
              <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-text-muted)]" />
                Autosave blueprint
              </p>
              <h2 className="mt-4 max-w-[660px] text-[30px] font-medium leading-[1.05] tracking-[-0.04em] text-[var(--color-text-primary)] sm:text-[40px] lg:text-[48px]">
                How autosave will work.
              </h2>
              <p className="mt-4 max-w-[58ch] text-[15px] leading-[1.55] text-[var(--color-text-secondary)]">
                Autosave is currently local-first while we finalize the backend contract. The architecture below outlines the
                production path.
              </p>
            </div>

            <div className="px-6 py-9 sm:px-8 sm:py-10">
              <div className="overflow-hidden rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-surface)]">
                {autosavePlan.map(item => (
                  <article key={item.title} className="border-b border-[var(--color-border-medium)] px-5 py-5 last:border-b-0">
                    <p className="text-[12px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{item.title}</p>
                    <p className="mt-2 text-[14px] leading-[1.55] text-[#c6d4e4]">{item.detail}</p>
                  </article>
                ))}
              </div>

              <p className="mt-6 text-[13px] leading-[1.6] text-[var(--color-text-faint)]">
                Want to participate in early collaboration trials? Reach out at{' '}
                <a className="underline decoration-[var(--color-text-muted)] underline-offset-4 transition hover:text-white" href={`mailto:${site.contactEmail}`}>
                  {site.contactEmail}
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </AnimateIn>
    </div>
  );
}
