'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Command, Menu, X } from 'lucide-react';

import ThemeToggle from '@/components/ThemeToggle';
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
        className="sticky top-0 z-50 h-[64px] backdrop-blur-xl transition-colors duration-300"
        style={{
          borderBottom: scrolled ? '1px solid var(--y-line)' : '1px solid transparent',
          background: scrolled ? 'color-mix(in srgb, var(--y-ink) 80%, transparent)' : 'transparent',
        }}
      >
        <div className="mx-auto flex h-full max-w-[1436px] items-center justify-between px-6 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 font-[family-name:var(--font-mono-code)] text-[15px] font-bold tracking-[-0.02em]"
            style={{ color: 'var(--y-fg)' }}
          >
            <span className="h-[15px] w-[15px] rounded-[4px]" style={{ background: 'var(--y-brand)' }} />
            yentic
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full px-3.5 py-1.5 text-sm transition-colors"
                  style={{ color: isActive ? 'var(--y-fg)' : 'var(--y-muted)' }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              className="hidden items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors sm:inline-flex"
              style={{ borderColor: 'var(--y-line)', color: 'var(--y-muted)' }}
              onClick={() =>
                document.dispatchEvent(
                  new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
                )
              }
            >
              <Command className="h-3 w-3" />
              <span>K</span>
            </button>

            <ThemeToggle />

            {!isAuthenticated && (
              <Link
                href="/signup"
                className="hidden rounded-full border px-4 py-1.5 text-sm font-semibold transition sm:inline-flex"
                style={{ borderColor: 'var(--y-line)', color: 'var(--y-fg)' }}
              >
                Sign up
              </Link>
            )}

            <Link
              href="/ide"
              className="rounded-full px-4 py-1.5 text-sm font-semibold transition"
              style={{ background: 'var(--y-brand)', color: 'var(--y-statfg)' }}
            >
              Open IDE
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border transition md:hidden"
              style={{ borderColor: 'var(--y-line)', color: 'var(--y-muted)' }}
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
              className="absolute right-0 top-0 h-full w-[280px] border-l"
              style={{ background: 'var(--y-ink)', borderColor: 'var(--y-line)' }}
            >
              <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--y-line)' }}>
                <span className="font-[family-name:var(--font-mono-code)] text-sm font-bold" style={{ color: 'var(--y-fg)' }}>
                  menu
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition"
                  style={{ borderColor: 'var(--y-line)', color: 'var(--y-muted)' }}
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
                      className="rounded-lg px-3 py-2.5 text-sm font-medium transition"
                      style={{
                        color: isActive ? 'var(--y-fg)' : 'var(--y-muted)',
                        background: isActive ? 'var(--y-sel-tint)' : 'transparent',
                      }}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                {!isAuthenticated && (
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mt-2 rounded-lg border px-3 py-2.5 text-center text-sm font-semibold transition"
                    style={{ borderColor: 'var(--y-line)', color: 'var(--y-fg)' }}
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
