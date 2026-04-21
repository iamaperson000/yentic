import Link from 'next/link';
import type { ReactNode } from 'react';

import { site } from '@/config/site';

import MarketingNav from './MarketingNav';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Features' },
  { href: '/roadmap', label: 'Roadmap' },
];

const footerColumns = [
  {
    title: 'Explore',
    links: [
      { href: '/features', label: 'Features' },
      { href: '/roadmap', label: 'Roadmap' },
      { href: '/ide', label: 'Open IDE' },
    ],
  },
  {
    title: 'Workspace',
    links: [
      { href: '/ide', label: 'Open IDE' },
      { href: '/signup', label: 'Create Account' },
    ],
  },
  {
    title: 'Policies',
    links: [
      { href: '/terms', label: 'Terms' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/signup', label: 'Sign up' },
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

            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
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

              <a
                href={site.githubUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`${site.name} on GitHub`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] text-white/65 transition hover:border-white/28 hover:bg-white/[0.07] hover:text-white"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.42-4.04-1.42-.55-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.72.08-.72 1.2.09 1.84 1.23 1.84 1.23 1.08 1.84 2.82 1.31 3.5 1 .11-.78.42-1.31.77-1.61-2.67-.31-5.48-1.34-5.48-5.94 0-1.31.47-2.37 1.23-3.21-.12-.3-.53-1.56.12-3.24 0 0 1.01-.32 3.3 1.22a11.42 11.42 0 0 1 6 0c2.29-1.54 3.29-1.22 3.29-1.22.65 1.68.24 2.94.12 3.24.77.84 1.23 1.9 1.23 3.21 0 4.61-2.81 5.63-5.49 5.93.43.37.82 1.09.82 2.2v3.27c0 .32.22.69.83.58A12 12 0 0 0 12 .5Z" />
                </svg>
                <span className="sr-only">GitHub</span>
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
