'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Command } from 'lucide-react';

import { site } from '@/config/site';
import { useScrollDirection } from '@/hooks/useScrollDirection';

export interface NavLink {
  href: string;
  label: string;
}

export default function MarketingNav({ links }: { links: NavLink[] }) {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const pathname = usePathname();
  const { hidden, scrolled } = useScrollDirection();

  return (
    <motion.nav
      animate={{ y: hidden ? -100 : 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className={`sticky top-0 z-50 h-[64px] backdrop-blur-xl transition-colors duration-300 ${
        scrolled
          ? 'border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)]/80'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-full max-w-[1436px] items-center justify-between px-6 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text-primary)]"
        >
          <span className="h-2 w-2 rounded-full bg-white" />
          {site.name}
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <button
            className="hidden items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] px-2.5 py-1.5 text-xs text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border-medium)] hover:text-[var(--color-text-secondary)] sm:inline-flex"
            onClick={() =>
              document.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
              )
            }
          >
            <Command className="h-3 w-3" />
            <span>K</span>
          </button>

          {!isAuthenticated && (
            <Link
              href="/signup"
              className="hidden rounded-full border border-white/20 px-4 py-1.5 text-sm font-semibold text-white/90 transition hover:border-white/40 sm:inline-flex"
            >
              Sign up
            </Link>
          )}

          <Link
            href="/ide"
            className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black transition hover:bg-slate-200"
          >
            Open IDE
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
