import Link from 'next/link';

import HeroCode from '@/components/marketing/HeroCode';
import HomeSections from '@/components/marketing/HomeSections';

function LandingHome() {
  return (
    <>
    <div
      className="-mx-6 -mt-12 overflow-hidden sm:-mt-16"
      style={{ color: 'var(--y-fg)', background: 'var(--y-ink)', borderBottom: '1px solid var(--y-line)' }}
    >
        {/* hero */}
        <div className="min-w-0 px-6 py-10 sm:px-[52px] sm:py-[52px]">
            <h1
              className="font-[family-name:var(--font-display)] text-[clamp(34px,6vw,60px)] font-extrabold leading-[1.0] tracking-[-0.035em]"
              style={{ maxWidth: '16ch' }}
            >
              Your dev environment is{' '}
              <span
                className="whitespace-nowrap rounded-[5px] px-2"
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

            <HeroCode />
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
