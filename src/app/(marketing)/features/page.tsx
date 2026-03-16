const featureGroups = [
  {
    title: 'Core editing',
    description: 'Monaco-powered editor with theme-tuned ergonomics, multi-file tabs, and inline error surfacing.',
    bullets: [
      'Command palette for quick file switching and actions (⌘K / Ctrl+K).',
      'Language-aware scaffolds and syntax highlighting for HTML, CSS, JS, and TS.',
      'In-editor formatting powered by Prettier presets (coming soon).'
    ]
  },
  {
    title: 'Live feedback',
    description: 'See changes as you type with a resilient preview and transparent build pipeline.',
    bullets: [
      'Sandpack preview stays synced with the active file and shares console output.',
      'Hot reload for styles and modules without manual refreshes.',
      'Build logs and error overlays planned for multi-language runtimes.'
    ]
  },
  {
    title: 'Collaboration ready (in development)',
    description: 'Designed for multiplayer from the start, even before the realtime cursor work lands.',
    bullets: [
      'Presence indicators, follow mode, and cursor streaming on the roadmap.',
      'Invite teammates via share links once authentication rolls out.',
      'Role-based permissions to separate viewers, editors, and owners.'
    ]
  }
];

export default function FeaturesPage() {
  return (
    <div className="space-y-16">
      <header className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300/80">Product</p>
        <h1 className="text-4xl font-semibold">What makes Yentic feel fast and familiar.</h1>
        <p className="max-w-2xl text-base text-white/70">
          Every interaction is tuned for focus. No cluttered sidebars, no forced AI assistants—just the essentials you
          need to build in the browser with confidence.
        </p>
      </header>

      <div className="grid gap-10">
        {featureGroups.map(group => (
          <section key={group.title} className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">{group.title}</h2>
              <p className="text-sm text-white/70">{group.description}</p>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-white/60">
              {group.bullets.map(item => (
                <li key={item} className="flex gap-3">
                  <span className="mt-[6px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="rounded-3xl border border-white/10 bg-black/40 p-8">
        <h2 className="text-2xl font-semibold">Coming next</h2>
        <p className="mt-2 text-sm text-white/70">
          Server-backed autosave, multiplayer cursors, and first-class support for Python, Rust, and Go builds are in
          active development. Subscribe to the roadmap to follow along.
        </p>
      </section>
    </div>
  );
}
