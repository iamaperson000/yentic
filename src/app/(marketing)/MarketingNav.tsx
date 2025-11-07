'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';

import { site } from '@/config/site';

type NavLink = {
  href: string;
  label: string;
};

type MarketingNavProps = {
  links: NavLink[];
};

export default function MarketingNav({ links }: MarketingNavProps) {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  return (
    <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
      <Link
        href="/"
        className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-white/80"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        {site.name}
      </Link>
      <div className="flex items-center gap-6 text-sm text-white/70">
        {links.map(link => (
          <Link key={link.href} href={link.href} className="transition hover:text-white">
            {link.label}
          </Link>
        ))}
        {!isAuthenticated && (
          <Link
            href="/signup"
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white"
          >
            Sign up
          </Link>
        )}
        <Link
          href="/ide"
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-black shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
        >
          Try the IDE
        </Link>
      </div>
    </nav>
  );
}
