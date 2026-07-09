import Link from 'next/link';

import CollabPlayground from '@/components/marketing/CollabPlayground';

const languages = [
  { name: 'Python', tint: '#8ee06f' },
  { name: 'JavaScript', tint: '#e0af68' },
  { name: 'HTML / CSS', tint: '#e5896b' },
  { name: 'C', tint: '#79c0ff' },
  { name: 'C++', tint: '#c9a2ff' },
  { name: 'Java', tint: '#ff8489' },
];

function Eyebrow({ children }: { children: string }) {
  return (
    <p className="font-[family-name:var(--font-mono-code)] text-[13px]" style={{ color: 'var(--y-brand)' }}>
      <span style={{ color: 'var(--y-muted)' }}>{'// '}</span>
      {children}
    </p>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="mt-3 font-[family-name:var(--font-display)] text-[clamp(26px,3.6vw,38px)] font-extrabold leading-[1.05] tracking-[-0.03em]"
      style={{ color: 'var(--y-fg)' }}
    >
      {children}
    </h2>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 max-w-[46ch] text-[16px] leading-[1.65]" style={{ color: 'var(--y-muted)' }}>
      {children}
    </p>
  );
}

function MonoLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="mt-6 inline-flex items-center gap-1.5 font-[family-name:var(--font-mono-code)] text-[14px] font-semibold"
      style={{ color: 'var(--y-brand)' }}
    >
      {children} <span aria-hidden>→</span>
    </Link>
  );
}

// A framed editor-style panel: bordered, with a mono header/tab bar.
function Panel({ tab, right, children }: { tab: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[11px] border" style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)' }}>
      <div
        className="flex items-center justify-between border-b px-4 py-2 font-[family-name:var(--font-mono-code)] text-[11.5px]"
        style={{ borderColor: 'var(--y-line)', color: 'var(--y-muted)' }}
      >
        <span>{tab}</span>
        {right}
      </div>
      {children}
    </div>
  );
}

export default function HomeSections() {
  return (
    <div className="mx-auto max-w-[1180px]">
      {/* ── no setup ──────────────────────────────────────────── */}
      <section className="grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        <div>
          <Eyebrow>no setup</Eyebrow>
          <Heading>It runs where you opened it.</Heading>
          <Body>
            Nothing to install, nothing to configure. Open a tab and you already have an editor, a
            live preview, and a run button — press it and the output shows up right there. The
            languages you actually use are ready to go:
          </Body>
          <MonoLink href="/ide">try it in the IDE</MonoLink>
        </div>
        <Panel tab="languages">
          <div className="flex flex-wrap gap-2.5 p-5">
            {languages.map((lang) => (
              <span
                key={lang.name}
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 font-[family-name:var(--font-mono-code)] text-[13px]"
                style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel2)', color: 'var(--y-fg)' }}
              >
                <span className="h-[9px] w-[9px] rounded-full" style={{ background: lang.tint }} />
                {lang.name}
              </span>
            ))}
          </div>
        </Panel>
      </section>

      {/* ── collaboration ─────────────────────────────────────── */}
      <section className="grid items-start gap-10 border-t py-16 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]" style={{ borderColor: 'var(--y-line)' }}>
        <div>
          <Eyebrow>edit together</Eyebrow>
          <Heading>Two people, one file.</Heading>
          <Body>
            Share a project and edit it together — you see each other&rsquo;s cursors and every keystroke
            as it happens. Same file, same output, no waiting to sync. That&rsquo;s ana editing on the
            right; click into the code and type alongside her, or open the full demo:
          </Body>
          <MonoLink href="/collab-demo">open the live demo</MonoLink>
        </div>
        <CollabPlayground />
      </section>

      {/* ── sharing (centered, echoes the hero highlight once) ──── */}
      <section className="flex flex-col items-center border-t py-12 text-center sm:py-16" style={{ borderColor: 'var(--y-line)' }}>
        <Eyebrow>share it</Eyebrow>
        <Heading>
          Every project is a{' '}
          <span className="whitespace-nowrap rounded-[5px] px-2" style={{ background: 'var(--y-brand)', color: 'var(--y-statfg)' }}>
            URL
          </span>
          .
        </Heading>
        <p className="mt-4 max-w-[52ch] text-[16px] leading-[1.65]" style={{ color: 'var(--y-muted)' }}>
          Press share and you get a link. Drop it in a message, a pull request, a class assignment —
          whoever opens it lands in the same workspace, running code included.
        </p>
        <div
          className="mt-8 flex w-full max-w-[460px] items-center gap-3 rounded-[11px] border px-4 py-3 text-left font-[family-name:var(--font-mono-code)] text-[13px]"
          style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel2)' }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--y-muted)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
            <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
          </svg>
          <span style={{ color: 'var(--y-fg)' }}>allinthetab.com/p/3f9a2c</span>
          <span
            className="ml-auto rounded-md px-2.5 py-1 text-[12px] font-semibold"
            style={{ background: 'var(--y-brand)', color: 'var(--y-statfg)' }}
          >
            Copy link
          </span>
        </div>
      </section>
    </div>
  );
}
