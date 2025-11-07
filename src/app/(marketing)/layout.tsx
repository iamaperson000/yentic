import Link from 'next/link';
import type { ReactNode } from 'react';

import { site } from '@/config/site';

import MarketingNav from './MarketingNav';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Features' },
  { href: '/roadmap', label: 'Roadmap' }
];

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#06070d] via-[#090b19] to-[#040509] text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(120,119,198,0.25),_transparent_60%)]" />
      <div className="relative">
        <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur">
          <MarketingNav links={navLinks} />
        </header>
        <main className="mx-auto flex max-w-5xl flex-col gap-24 px-6 py-16">{children}</main>
        <footer className="border-t border-white/10 bg-black/40 py-10">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 text-sm text-white/50">
            <p>© {new Date().getFullYear()} {site.name}. Built for developers who want a faster web IDE.</p>
            <p className="text-white/40">
              Visit{' '}
              <a
                className="underline decoration-emerald-400/60 underline-offset-4 hover:text-white"
                href={site.marketingUrl}
                target="_blank"
                rel="noreferrer"
              >
                {new URL(site.marketingUrl).host}
              </a>{' '}
              to follow the journey.
            </p>
            <div className="flex flex-wrap gap-4 text-xs text-white/40">
              <Link className="transition hover:text-white" href="/terms">
                Terms &amp; Conditions
              </Link>
              <Link className="transition hover:text-white" href="/privacy">
                Privacy Policy
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
