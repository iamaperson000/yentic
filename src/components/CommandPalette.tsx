'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import { Code2, FileCode, Globe, Home, Map, Terminal, UserCircle, type LucideIcon } from 'lucide-react';

type CommandPaletteItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  keywords?: string[];
};

const baseNavigationItems: CommandPaletteItem[] = [
  { label: 'Open IDE', href: '/ide', icon: Code2, keywords: ['workspace', 'picker', 'launch'] },
  { label: 'Home', href: '/', icon: Home, keywords: ['landing', 'dashboard'] },
  { label: 'Features', href: '/features', icon: FileCode, keywords: ['capabilities', 'product'] },
  { label: 'Roadmap', href: '/roadmap', icon: Map, keywords: ['plans', 'future'] },
];

const workspaceItems: CommandPaletteItem[] = [
  { label: 'Web', href: '/ide/web', icon: Globe, keywords: ['html', 'css', 'javascript', 'browser'] },
  { label: 'Python', href: '/ide/python', icon: Terminal, keywords: ['py', 'runtime'] },
  { label: 'C', href: '/ide/c', icon: Terminal, keywords: ['clang', 'runtime'] },
  { label: 'C++', href: '/ide/cpp', icon: Terminal, keywords: ['cpp', 'cplusplus', 'runtime'] },
  { label: 'Java', href: '/ide/java', icon: Terminal, keywords: ['jvm', 'runtime'] },
];

function normalizePath(path: string | null | undefined) {
  if (!path) {
    return '/';
  }

  const [pathname] = path.split('?');
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const currentPath = normalizePath(pathname);

  const profileItem: CommandPaletteItem =
    status !== 'authenticated'
      ? {
          label: 'Sign up',
          href: '/signup',
          icon: UserCircle,
          keywords: ['account', 'register', 'profile'],
        }
      : session?.user?.username
        ? {
            label: 'Profile',
            href: `/u/${session.user.username}`,
            icon: UserCircle,
            keywords: ['account', 'user', session.user.username],
          }
        : {
            label: 'Finish profile',
            href: '/setup-profile',
            icon: UserCircle,
            keywords: ['username', 'account', 'setup'],
          };

  const navigationItems = [...baseNavigationItems, profileItem].filter(
    (item) => normalizePath(item.href) !== currentPath
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15 }}
            className="relative z-10 w-full max-w-[520px] overflow-hidden rounded-xl border border-[var(--color-border-medium)] bg-[var(--color-bg-overlay)] shadow-2xl"
          >
            <Command className="flex flex-col" label="Command palette">
              <Command.Input
                placeholder="Search pages, workspaces..."
                className="w-full border-b border-[var(--color-border-medium)] bg-transparent px-4 py-3.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
                autoFocus
              />
              <Command.List className="custom-scrollbar max-h-[320px] overflow-y-auto p-2">
                <Command.Empty className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                  No results found.
                </Command.Empty>

                {navigationItems.length > 0 && (
                  <Command.Group heading="Navigation">
                    {navigationItems.map((item) => (
                      <Command.Item
                        key={item.href}
                        value={item.label}
                        keywords={item.keywords}
                        onSelect={() => navigate(item.href)}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-[var(--color-text-secondary)] transition-colors data-[selected=true]:bg-white/5 data-[selected=true]:text-[var(--color-text-primary)]"
                      >
                        <item.icon className="h-4 w-4 text-[var(--color-text-muted)]" />
                        {item.label}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                <Command.Group heading="Workspaces">
                  {workspaceItems.map((item) => (
                    <Command.Item
                      key={item.href}
                      value={item.label}
                      keywords={item.keywords}
                      onSelect={() => navigate(item.href)}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-[var(--color-text-secondary)] transition-colors data-[selected=true]:bg-white/5 data-[selected=true]:text-[var(--color-text-primary)]"
                    >
                      <item.icon className="h-4 w-4 text-[var(--color-text-muted)]" />
                      {item.label}
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
