'use client';

import { site } from '@/config/site';
import { AnimateIn } from '@/components/ui/AnimateIn';
import PageHero from '@/components/marketing/PageHero';

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
    <div className="flex flex-col gap-14">
      <AnimateIn delay={0}>
        <PageHero
          eyebrow="roadmap"
          title="Where Yentic is headed."
          lead="Autosave and multiplayer are the next milestones. After that, server-side execution for more languages."
        />
      </AnimateIn>

      <AnimateIn delay={0.1}>
        <section
          className="overflow-hidden rounded-[12px] border"
          style={{ borderColor: 'var(--y-line)', background: 'var(--y-ink)' }}
        >
          <div className="border-b px-6 py-7 sm:px-8" style={{ borderColor: 'var(--y-line)' }}>
            <p className="font-[family-name:var(--font-mono-code)] text-[12.5px]" style={{ color: 'var(--y-brand)' }}>
              # delivery phases
            </p>
            <h2
              className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.02em]"
              style={{ color: 'var(--y-fg)' }}
            >
              Now, next, and later.
            </h2>
          </div>
          <div className="grid gap-px md:grid-cols-3" style={{ background: 'var(--y-line)' }}>
            {roadmapPhases.map((bucket) => (
              <section key={bucket.phase} className="px-6 py-7 sm:px-8" style={{ background: 'var(--y-ink)' }}>
                <h3
                  className="font-[family-name:var(--font-mono-code)] text-sm font-semibold"
                  style={{ color: 'var(--y-brand)' }}
                >
                  {bucket.phase}
                </h3>
                <ul className="mt-5 space-y-3 text-sm leading-[1.55]" style={{ color: 'var(--y-muted)' }}>
                  {bucket.highlights.map((item) => (
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
          className="overflow-hidden rounded-[12px] border lg:grid lg:grid-cols-[1.2fr_0.8fr]"
          style={{ borderColor: 'var(--y-line)', background: 'var(--y-ink)' }}
        >
          <div className="border-b px-6 py-9 sm:px-8 lg:border-b-0 lg:border-r" style={{ borderColor: 'var(--y-line)' }}>
            <p className="font-[family-name:var(--font-mono-code)] text-[12.5px]" style={{ color: 'var(--y-brand)' }}>
              # autosave blueprint
            </p>
            <h2
              className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.02em]"
              style={{ color: 'var(--y-fg)' }}
            >
              How autosave will work.
            </h2>
            <p className="mt-4 max-w-[58ch] text-[15px] leading-[1.6]" style={{ color: 'var(--y-muted)' }}>
              Autosave is currently local-first while we finalize the backend contract. The architecture below outlines the
              production path.
            </p>
          </div>

          <div className="px-6 py-9 sm:px-8">
            <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)' }}>
              {autosavePlan.map((item) => (
                <article
                  key={item.title}
                  className="border-b px-5 py-5 last:border-b-0"
                  style={{ borderColor: 'var(--y-line)' }}
                >
                  <p className="font-[family-name:var(--font-mono-code)] text-xs" style={{ color: 'var(--y-brand)' }}>
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-[1.6]" style={{ color: 'var(--y-muted)' }}>
                    {item.detail}
                  </p>
                </article>
              ))}
            </div>

            <p className="mt-6 text-[13px] leading-[1.6]" style={{ color: 'var(--y-muted)' }}>
              Want to join early collaboration trials? Reach out at{' '}
              <a className="underline underline-offset-4" style={{ color: 'var(--y-brand)' }} href={`mailto:${site.contactEmail}`}>
                {site.contactEmail}
              </a>
              .
            </p>
          </div>
        </section>
      </AnimateIn>
    </div>
  );
}
