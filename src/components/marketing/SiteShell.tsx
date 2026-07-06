import type { ReactNode } from 'react';

import MarketingNav from '@/app/(marketing)/MarketingNav';
import SiteFooter from './SiteFooter';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Features' },
  { href: '/roadmap', label: 'Roadmap' },
];

// Nav + footer shell for standalone routes that live outside the (marketing) group.
export default function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--y-ink)', color: 'var(--y-fg)' }}>
      <MarketingNav links={navLinks} />
      <main className="mx-auto w-full max-w-[1436px] px-6 py-12 sm:py-16">{children}</main>
      <SiteFooter />
    </div>
  );
}
