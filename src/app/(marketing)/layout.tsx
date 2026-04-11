import Link from 'next/link';
import type { ReactNode } from 'react';

import { site } from '@/config/site';

import MarketingNav from './MarketingNav';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Features' },
  { href: '/roadmap', label: 'Roadmap' },
  { href: '/chat', label: 'Chat Lab' },
];

const footerColumns = [
  {
    title: 'Explore',
    links: [
      { href: '/features', label: 'Features' },
      { href: '/roadmap', label: 'Roadmap' },
      { href: '/chat', label: 'Chat Lab' },
    ],
  },
  {
    title: 'Workspace',
    links: [
      { href: '/ide', label: 'Open IDE' },
      { href: '/ide#saved-projects', label: 'Saved Projects' },
      { href: '/signup', label: 'Create Account' },
    ],
  },
  {
    title: 'Policies',
    links: [
      { href: '/terms', label: 'Terms' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/', label: 'Home' },
    ],
  },
];

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[var(--color-bg-primary)] text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-10%,_rgba(255,255,255,0.09),_transparent_58%)]" />

      <div className="relative">
        <MarketingNav links={navLinks} />

        <main className="mx-auto flex w-full max-w-[1436px] flex-col gap-24 px-6 py-12 sm:py-16">
          {children}
        </main>

        <footer className="border-t border-[var(--color-border-subtle)] bg-black/35 py-10">
          <div className="mx-auto flex w-full max-w-[1436px] flex-col gap-8 px-6">
            <div className="grid gap-8 border-b border-[var(--color-border-subtle)] pb-8 md:grid-cols-3">
              {footerColumns.map((column) => (
                <section key={column.title}>
                  <p className="text-[12px] uppercase tracking-[0.12em] text-white/45">
                    {column.title}
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    {column.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="text-sm text-white/72 transition hover:text-white"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="flex flex-col gap-2 text-sm text-white/55">
              <p>
                &copy; {new Date().getFullYear()} {site.name}. Fast browser editing without the
                noise.
              </p>
              <p className="text-white/40">
                Follow updates at{' '}
                <a
                  className="underline decoration-emerald-400/60 underline-offset-4 hover:text-white"
                  href={site.marketingUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {new URL(site.marketingUrl).host}
                </a>
                .
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
