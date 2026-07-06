'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';

import GutterSpine from '@/components/marketing/GutterSpine';
import StatusBar from '@/components/marketing/StatusBar';
import SignedInHomeShell from '@/components/home/SignedInHomeShell';

function LandingHome() {
  return (
    <div className="mx-auto w-full max-w-[1080px]" style={{ color: 'var(--y-fg)' }}>
      <div
        className="overflow-hidden rounded-[14px] border shadow-[0_30px_90px_rgba(0,0,0,.4)]"
        style={{ background: 'var(--y-ink)', borderColor: 'var(--y-line)' }}
      >
        {/* tab strip */}
        <div
          className="flex font-[family-name:var(--font-mono-code)] text-[12.5px]"
          style={{ background: 'var(--y-panel2)', borderBottom: '1px solid var(--y-line)' }}
        >
          <div
            className="flex items-center gap-2 border-r px-[18px] py-[9px]"
            style={{ borderColor: 'var(--y-line)', borderTop: '2px solid var(--y-brand)', color: 'var(--y-fg)' }}
          >
            <span className="h-[7px] w-[7px] rounded-full" style={{ background: 'var(--y-brand)' }} />
            welcome.py
          </div>
          <div className="border-r px-[18px] py-[11px]" style={{ borderColor: 'var(--y-line)', color: 'var(--y-muted)' }}>
            readme.md
          </div>
        </div>

        {/* hero: gutter + stage */}
        <div className="grid grid-cols-[40px_1fr] sm:grid-cols-[56px_1fr]">
          <GutterSpine lines={17} />
          <div className="px-6 py-10 sm:px-[52px] sm:py-[52px]">
            <h1
              className="font-[family-name:var(--font-display)] text-[clamp(34px,6vw,60px)] font-extrabold leading-[1.0] tracking-[-0.035em]"
              style={{ maxWidth: '16ch' }}
            >
              Your dev environment is{' '}
              <span
                className="rounded-[3px] px-1.5 [-webkit-box-decoration-break:clone] [box-decoration-break:clone]"
                style={{ background: 'var(--y-sel-hl)' }}
              >
                now a URL
              </span>
              <span
                className="y-caret ml-0.5 inline-block h-[0.9em] w-[3px] align-[-0.12em]"
                style={{ background: 'var(--y-brand)', animation: 'yblink 1.05s steps(1) infinite' }}
              />
              .
            </h1>
            <p className="mt-6 text-[17px]" style={{ color: 'var(--y-muted)' }}>
              write it, run it, share it — all in the tab
            </p>
            <div className="mt-8 flex flex-wrap gap-[11px] font-[family-name:var(--font-mono-code)] text-[13px]">
              <Link
                href="/ide"
                className="rounded-[9px] px-[22px] py-3 font-semibold"
                style={{ background: 'var(--y-brand)', color: 'var(--y-statfg)' }}
              >
                Open the IDE
              </Link>
              <Link
                href="/features"
                className="rounded-[9px] border px-[22px] py-3"
                style={{ borderColor: 'var(--y-line)', color: 'var(--y-fg)' }}
              >
                Browse an example
              </Link>
            </div>

            {/* live code block */}
            <div
              className="mt-10 overflow-hidden rounded-[11px] border"
              style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)' }}
            >
              <div
                className="flex justify-between border-b px-[15px] py-[10px] font-[family-name:var(--font-mono-code)] text-[11.5px]"
                style={{ borderColor: 'var(--y-line)', color: 'var(--y-muted)' }}
              >
                <span>welcome.py</span>
                <span style={{ color: 'var(--y-brand)' }}>▶ run</span>
              </div>
              <pre
                className="overflow-x-auto whitespace-pre px-5 py-[18px] font-[family-name:var(--font-mono-code)] text-[13px] leading-[1.9]"
                style={{ color: 'var(--y-fg)' }}
              >
                <span style={{ color: 'var(--y-muted)', fontStyle: 'italic' }}>
                  # hit run — output appears below, no backend
                </span>
                {'\n'}
                <span style={{ color: 'var(--y-kw)' }}>def</span>{' '}
                <span style={{ color: 'var(--y-fn)' }}>primes</span>(limit):{'\n'}
                {'    '}sieve = [<span style={{ color: 'var(--y-kw)' }}>True</span>] * limit{'\n'}
                {'    '}
                <span style={{ color: 'var(--y-kw)' }}>for</span> n{' '}
                <span style={{ color: 'var(--y-op)' }}>in</span>{' '}
                <span style={{ color: 'var(--y-fn)' }}>range</span>(
                <span style={{ color: 'var(--y-num)' }}>2</span>,{' '}
                <span style={{ color: 'var(--y-fn)' }}>int</span>(limit**
                <span style={{ color: 'var(--y-num)' }}>0.5</span>)+
                <span style={{ color: 'var(--y-num)' }}>1</span>):{'\n'}
                {'        '}
                <span style={{ color: 'var(--y-kw)' }}>if</span> sieve[n]: sieve[n*n::n] = [
                <span style={{ color: 'var(--y-kw)' }}>False</span>] *{' '}
                <span style={{ color: 'var(--y-fn)' }}>len</span>(sieve[n*n::n]){'\n'}
                {'    '}
                <span style={{ color: 'var(--y-kw)' }}>return</span> [i{' '}
                <span style={{ color: 'var(--y-kw)' }}>for</span> i{' '}
                <span style={{ color: 'var(--y-op)' }}>in</span>{' '}
                <span style={{ color: 'var(--y-fn)' }}>range</span>(
                <span style={{ color: 'var(--y-num)' }}>2</span>, limit){' '}
                <span style={{ color: 'var(--y-kw)' }}>if</span> sieve[i]]{'\n\n'}
                <span style={{ color: 'var(--y-fn)' }}>print</span>(
                <span style={{ color: 'var(--y-fn)' }}>primes</span>(
                <span style={{ color: 'var(--y-num)' }}>30</span>))
              </pre>
              <div
                className="border-t px-5 py-[13px] font-[family-name:var(--font-mono-code)] text-[12.5px]"
                style={{ borderColor: 'var(--y-line)', background: 'var(--y-console-bg)', color: 'var(--y-str)' }}
              >
                <span style={{ color: 'var(--y-muted)' }}>→ </span>[2, 3, 5, 7, 11, 13, 17, 19, 23, 29]{'  '}
                <span style={{ color: 'var(--y-muted)' }}># 0.04s · pyodide/wasm</span>
              </div>
            </div>
          </div>
        </div>

        <StatusBar
          items={['welcome.py', 'Python 3.12', 'Ln 15, Col 22']}
          right={['runs in-browser', 'UTF-8', '⧉ share']}
        />
      </div>
    </div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="min-h-[40vh]" aria-hidden />;
  }

  if (status === 'authenticated' && session?.user) {
    return <SignedInHomeShell />;
  }

  return <LandingHome />;
}
