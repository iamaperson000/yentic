import Link from 'next/link';

const languages = [
  { name: 'Python', tint: 'var(--color-tint-python)', note: 'real CPython, via Pyodide' },
  { name: 'Web', tint: 'var(--color-tint-web)', note: 'HTML, CSS & JS, live preview' },
  { name: 'C', tint: 'var(--color-tint-c)', note: 'interpreted in the browser' },
  { name: 'C++', tint: 'var(--color-tint-cpp)', note: 'interpreted in the browser' },
  { name: 'Java', tint: 'var(--color-tint-java)', note: 'compiled to JS, in the browser' },
];

function Eyebrow({ children }: { children: string }) {
  return (
    <p
      className="font-[family-name:var(--font-mono-code)] text-[13px]"
      style={{ color: 'var(--y-brand)' }}
    >
      <span style={{ color: 'var(--y-muted)' }}>{'// '}</span>
      {children}
    </p>
  );
}

function Heading({ children }: { children: string }) {
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

export default function HomeSections() {
  return (
    <div className="mt-4">
      {/* ── execution ─────────────────────────────────────────── */}
      <section className="grid items-center gap-10 border-t py-16 sm:py-20 lg:grid-cols-[1fr_minmax(0,440px)]" style={{ borderColor: 'var(--y-line)' }}>
        <div>
          <Eyebrow>runs in the browser</Eyebrow>
          <Heading>It runs where you opened it.</Heading>
          <Body>
            No build server to wait on, nothing to install. Python runs on real CPython through
            Pyodide, web projects render in a preview that reloads as you type, and C, C++, and Java
            run client-side too. The tab you&rsquo;re reading this in can already do all of it.
          </Body>
        </div>
        <ul
          className="overflow-hidden rounded-[11px] border font-[family-name:var(--font-mono-code)] text-[13px]"
          style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)' }}
        >
          {languages.map((lang, i) => (
            <li
              key={lang.name}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--y-line)' }}
            >
              <span className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: lang.tint }} />
              <span style={{ color: 'var(--y-fg)' }}>{lang.name}</span>
              <span className="ml-auto text-right" style={{ color: 'var(--y-muted)' }}>{lang.note}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── collaboration ─────────────────────────────────────── */}
      <section className="grid items-center gap-10 border-t py-16 sm:py-20 lg:grid-cols-[1fr_minmax(0,440px)]" style={{ borderColor: 'var(--y-line)' }}>
        <div>
          <Eyebrow>edit together</Eyebrow>
          <Heading>Two people, one file.</Heading>
          <Body>
            Share a project and edit it at the same time — you see each other&rsquo;s cursors and every
            keystroke as it lands. Same file, same output, no merge step. It&rsquo;s the engine behind the
            live demo, which opens without an account.
          </Body>
          <Link
            href="/collab-demo"
            className="mt-6 inline-flex items-center gap-1.5 font-[family-name:var(--font-mono-code)] text-[14px] font-semibold"
            style={{ color: 'var(--y-brand)' }}
          >
            open the live demo <span aria-hidden>→</span>
          </Link>
        </div>
        <div
          className="rounded-[11px] border p-5 font-[family-name:var(--font-mono-code)] text-[13px] leading-[2]"
          style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)' }}
        >
          <div style={{ color: 'var(--y-fg)' }}>
            <span style={{ color: 'var(--y-kw)' }}>def</span>{' '}
            <span style={{ color: 'var(--y-fn)' }}>greet</span>(name):
          </div>
          <div className="relative" style={{ color: 'var(--y-fg)', paddingLeft: '2ch' }}>
            <span style={{ color: 'var(--y-kw)' }}>return</span>{' '}
            <span style={{ color: 'var(--y-str)' }}>f&quot;welcome, {'{'}name{'}'}&quot;</span>
            <span className="ml-0.5 inline-block h-[1.05em] w-[2px] align-[-0.2em]" style={{ background: 'var(--y-brand)' }} />
            <span className="ml-1 rounded px-1.5 py-0.5 text-[11px]" style={{ background: 'var(--y-brand)', color: 'var(--y-statfg)' }}>you</span>
          </div>
          <div className="relative" style={{ color: 'var(--y-fg)' }}>
            <span style={{ color: 'var(--y-fn)' }}>print</span>(<span style={{ color: 'var(--y-fn)' }}>greet</span>(<span style={{ color: 'var(--y-str)' }}>&quot;team&quot;</span>))
            <span className="ml-0.5 inline-block h-[1.05em] w-[2px] align-[-0.2em]" style={{ background: 'var(--y-str)' }} />
            <span className="ml-1 rounded px-1.5 py-0.5 text-[11px]" style={{ background: 'var(--y-str)', color: 'var(--y-statfg)' }}>ana</span>
          </div>
        </div>
      </section>

      {/* ── sharing (centered, to break the two-column rhythm) ──── */}
      <section className="flex flex-col items-center border-t py-16 text-center sm:py-20" style={{ borderColor: 'var(--y-line)' }}>
        <Eyebrow>share it</Eyebrow>
        <Heading>Every project is a URL.</Heading>
        <p className="mt-4 max-w-[52ch] text-[16px] leading-[1.65]" style={{ color: 'var(--y-muted)' }}>
          Press share and you get a link. Drop it in a message, a pull request, a class assignment —
          whoever opens it lands in the same workspace, running code included.
        </p>
        <div
          className="mt-8 flex w-full max-w-[420px] items-center gap-3 rounded-[10px] border px-4 py-3 text-left font-[family-name:var(--font-mono-code)] text-[13px]"
          style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel2)' }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--y-muted)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
            <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
          </svg>
          <span style={{ color: 'var(--y-fg)' }}>yentic.com/p/3f9a2c</span>
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
