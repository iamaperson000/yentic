import Image from 'next/image';
import Link from 'next/link';

import { site } from '@/config/site';

const footerColumns = [
  {
    title: 'explore',
    links: [
      { href: '/features', label: 'Features' },
      { href: '/roadmap', label: 'Roadmap' },
      { href: '/ide', label: 'Open IDE' },
    ],
  },
  {
    title: 'workspace',
    links: [
      { href: '/ide', label: 'Open IDE' },
      { href: '/signup', label: 'Create account' },
    ],
  },
  {
    title: 'policies',
    links: [
      { href: '/terms', label: 'Terms' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/signup', label: 'Sign up' },
    ],
  },
];

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ borderTop: '1px solid var(--y-line)' }}>
      <div className="mx-auto flex w-full max-w-[1436px] flex-col gap-8 px-6 py-10">
        <div className="grid gap-8 border-b pb-8 md:grid-cols-3" style={{ borderColor: 'var(--y-line)' }}>
          {footerColumns.map((column) => (
            <section key={column.title}>
              <p className="font-[family-name:var(--font-mono-code)] text-[12px]" style={{ color: 'var(--y-muted)' }}>
                {column.title}
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {column.links.map((link) => (
                  <Link key={`${column.title}-${link.href}`} href={link.href} className="text-sm transition hover:opacity-80" style={{ color: 'var(--y-muted)' }}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="font-[family-name:var(--font-mono-code)] text-[12px]" style={{ color: 'var(--y-muted)' }}>
proudly sponsored by
          </span>
          <a href="https://liveblocks.io" target="_blank" rel="noreferrer" className="inline-flex transition hover:opacity-90" aria-label="Liveblocks">
            <Image
              src="/liveblocks.png"
              alt="Liveblocks"
              width={116}
              height={26}
              className="rounded-md"
              style={{ height: 26, width: 'auto' }}
            />
          </a>
        </div>

        <div className="flex flex-col gap-2 text-sm" style={{ color: 'var(--y-muted)' }}>
          <p>
            &copy; {year} {site.name}. A real IDE that runs in your browser.
          </p>
          <p>
            Follow updates at{' '}
            <a className="underline underline-offset-4" style={{ color: 'var(--y-brand)' }} href={site.marketingUrl} target="_blank" rel="noreferrer">
              {new URL(site.marketingUrl).host}
            </a>
            .
          </p>
        </div>
      </div>

      {/* editor status bar as the site footer cap */}
      <div
        className="flex h-9 items-center gap-5 overflow-x-auto whitespace-nowrap px-6 font-[family-name:var(--font-mono-code)] text-[11.5px]"
        style={{ background: 'var(--y-panel)', borderTop: '1px solid var(--y-line)', color: 'var(--y-muted)' }}
      >
        <span className="flex items-center gap-2">
          <span className="h-[7px] w-[7px] rounded-full" style={{ background: 'var(--y-str)' }} />
          ready
        </span>
        <span>main</span>
        <span>UTF-8</span>
        <span className="ml-auto" style={{ color: 'var(--y-brand)' }}>yentic</span>
      </div>
    </footer>
  );
}
