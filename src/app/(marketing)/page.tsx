import Link from 'next/link';

import HeroBackdrop from '@/components/marketing/HeroBackdrop';
import HeroCode from '@/components/marketing/HeroCode';
import HomeSections from '@/components/marketing/HomeSections';

function LandingHome() {
  return (
    <>
    <div
      className="relative -mx-6 -mt-12 overflow-hidden sm:-mt-16"
      style={{ color: 'var(--y-fg)', background: '#0a090d', borderBottom: '1px solid var(--y-line)' }}
    >
        <HeroBackdrop />
        {/* hero */}
        <div className="relative z-[2] mx-auto flex min-h-[94vh] max-w-[900px] flex-col items-center px-6 pt-[19vh] pb-16 text-center">
          <p className="font-[family-name:var(--font-mono-code)] text-[13px] uppercase tracking-[0.28em]" style={{ color: 'var(--y-brand)' }}>
            WRITE IT <span style={{ color: 'rgba(236,231,222,.35)' }}>·</span> RUN IT{' '}
            <span style={{ color: 'rgba(236,231,222,.35)' }}>·</span> SHARE IT
          </p>
          <h1
            className="mt-7 font-[family-name:var(--font-display)] text-[clamp(44px,6.5vw,84px)] font-extrabold leading-[1.0] tracking-[-0.035em]"
            style={{ maxWidth: '15ch', textShadow: '0 2px 40px rgba(0,0,0,.5)' }}
          >
            Your dev environment is{' '}
            <span
              className="whitespace-nowrap rounded-[6px] px-2"
              style={{ background: 'var(--y-brand)', color: 'var(--y-statfg)' }}
            >
              now a URL
            </span>
            <span
              className="y-caret ml-0.5 inline-block h-[0.9em] w-[3px] align-[-0.12em]"
              style={{ background: 'var(--y-brand)', animation: 'yblink 1.05s steps(1) infinite' }}
            />
            .
          </h1>
          <p className="mt-6 text-[18px]" style={{ color: 'var(--y-muted)', maxWidth: '44ch' }}>
            a real IDE that opens like a new tab — no install, nothing to configure
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-[11px] font-[family-name:var(--font-mono-code)] text-[13px]">
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
              See what it does
            </Link>
          </div>
          <div className="mt-16 w-full max-w-[760px] text-left">
            <HeroCode />
          </div>
        </div>
    </div>
    <HomeSections />
    </>
  );
}

export default function Home() {
  // `/` always shows the marketing homepage — signed-in users get their
  // projects at /projects (and land there after login).
  return <LandingHome />;
}
