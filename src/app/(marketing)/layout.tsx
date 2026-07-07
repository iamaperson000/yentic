import type { ReactNode } from 'react';

import SiteFooter from '@/components/marketing/SiteFooter';
import SponsorBand from '@/components/marketing/SponsorBand';

import MarketingNav from './MarketingNav';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Features' },
  { href: '/roadmap', label: 'Roadmap' },
];

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--y-ink)', color: 'var(--y-fg)' }}>
      <MarketingNav links={navLinks} />
      <main className="mx-auto w-full max-w-[1436px] px-6 py-12 sm:py-16">{children}</main>
      <SponsorBand />
      <SiteFooter />
    </div>
  );
}
