'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Command, Menu, X } from 'lucide-react';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
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

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] transition hover:border-[var(--color-border-medium)] hover:text-white md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-black/70 md:hidden"
          >
            <div className="absolute inset-0" onClick={() => setMobileMenuOpen(false)} />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute right-0 top-0 h-full w-[280px] border-l border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)]"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-5 py-4">
                <span className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text-primary)]">
                  Menu
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] transition hover:text-white"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-col gap-1 px-4 py-4">
                {links.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-[var(--color-text-muted)] hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                {!isAuthenticated && (
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mt-2 rounded-lg border border-white/20 px-3 py-2.5 text-center text-sm font-semibold text-white/90 transition hover:border-white/40"
                  >
                    Sign up
                  </Link>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
