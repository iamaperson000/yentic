import Link from 'next/link';
import type { ReactNode } from 'react';

import { site } from '@/config/site';

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
          <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-white/80">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              {site.name}
            </Link>
            <div className="flex items-center gap-6 text-sm text-white/70">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/signup"
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white"
              >
                Sign up
              </Link>
              <Link
                href="/ide"
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-black shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
              >
                Try the IDE
              </Link>
            </div>
          </nav>
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
