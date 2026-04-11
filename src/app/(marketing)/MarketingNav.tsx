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
    <nav className="mx-auto flex h-[72px] w-full max-w-[1436px] items-center justify-between px-6">
      <Link
        href="/"
        className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-white/90"
      >
        <span className="h-2 w-2 rounded-full bg-white/75" />
        {site.name}
      </Link>
      <div className="flex items-center gap-2 text-sm text-white/75 sm:gap-3">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="hidden rounded-full px-3 py-2 text-[14px] leading-none transition hover:bg-white/10 hover:text-white md:inline-flex"
          >
            {link.label}
          </Link>
        ))}
        {!isAuthenticated && (
          <Link
            href="/signup"
            className="hidden rounded-full border border-white/20 px-4 py-2 text-[14px] font-medium leading-none text-white/90 transition hover:border-white/40 hover:text-white sm:inline-flex"
          >
            Sign up
          </Link>
        )}
        <Link
          href="/ide"
          className="rounded-full bg-white px-4 py-2 text-[14px] font-semibold leading-none text-black transition hover:bg-slate-200"
        >
          Open IDE
        </Link>
      </div>
    </nav>
  );
}
