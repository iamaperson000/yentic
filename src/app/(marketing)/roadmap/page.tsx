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
      'Incremental snapshotting so only changed files are sent to the server—ideal for fast autosave.',
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
      'Each project will receive a stable UUID. File contents are persisted in a Supabase Postgres table using JSONB for metadata and a compressed text column for code. Large assets will live in Supabase storage buckets referenced by the project record.'
  },
  {
    title: 'Sync cadence',
    detail:
      'The client batches edits every few seconds. If nothing changed, it sends a heartbeat to keep the session active. We also expose a manual "Save now" action that forces an immediate snapshot.'
  },
  {
    title: 'Conflict resolution',
    detail:
      'When multiplayer lands, edits merge through operational transforms. Until then, the server keeps the latest snapshot and prior versions are archived so you can roll back if needed.'
  }
];

export default function RoadmapPage() {
  return (
    <div className="space-y-16">
      <header className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300/80">Roadmap</p>
        <h1 className="text-4xl font-semibold">Where Yentic is headed.</h1>
        <p className="max-w-2xl text-base text-white/70">
          We ship in small, deliberate increments. Autosave and multiplayer are the next major milestones, followed by a
          cloud execution layer for more languages.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {roadmapPhases.map(bucket => (
          <div key={bucket.phase} className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold text-white">{bucket.phase}</h2>
            <ul className="mt-4 space-y-3 text-sm text-white/60">
              {bucket.highlights.map(item => (
                <li key={item} className="flex gap-3">
                  <span className="mt-[6px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-8">
        <h2 className="text-2xl font-semibold">Autosave blueprint</h2>
        <p className="mt-3 text-sm text-white/70">
          Autosave is currently local-first (via browser storage) while we finalize the backend contract. Here&apos;s how the
          cloud flow will work when we flip the switch:
        </p>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {autosavePlan.map(item => (
            <article key={item.title} className="rounded-2xl border border-white/20 bg-black/30 p-6">
              <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200/80">{item.title}</h3>
              <p className="mt-3 text-sm text-white/70">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/40 p-8">
        <h2 className="text-2xl font-semibold">Get involved</h2>
        <p className="mt-3 text-sm text-white/70">
          We&apos;re looking for teams who want to dogfood the multiplayer builds. Reach out at{' '}
          <a className="underline decoration-emerald-400/60 underline-offset-4" href="mailto:hello@yentic.com">
            hello@yentic.com
          </a>{' '}
          to reserve a spot.
        </p>
      </section>
    </div>
  );
}
