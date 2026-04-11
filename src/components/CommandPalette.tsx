'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import { Code2, FileCode, Globe, Layout, Map, Terminal, UserCircle } from 'lucide-react';

const navigationItems = [
  { label: 'Open IDE', href: '/ide', icon: Code2 },
  { label: 'Dashboard', href: '/dashboard', icon: Layout },
  { label: 'Features', href: '/features', icon: FileCode },
  { label: 'Roadmap', href: '/roadmap', icon: Map },
  { label: 'Profile', href: '/dashboard', icon: UserCircle },
];

const workspaceItems = [
  { label: 'Web', href: '/ide/web', icon: Globe },
  { label: 'Python', href: '/ide/python', icon: Terminal },
  { label: 'C', href: '/ide/c', icon: Terminal },
  { label: 'C++', href: '/ide/cpp', icon: Terminal },
  { label: 'Java', href: '/ide/java', icon: Terminal },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
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

                <Command.Group heading="Navigation">
                  <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Navigation</p>
                  {navigationItems.map((item) => (
                    <Command.Item
                      key={item.href}
                      value={item.label}
                      onSelect={() => navigate(item.href)}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-[var(--color-text-secondary)] transition-colors data-[selected=true]:bg-white/5 data-[selected=true]:text-[var(--color-text-primary)]"
                    >
                      <item.icon className="h-4 w-4 text-[var(--color-text-muted)]" />
                      {item.label}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Workspaces">
                  <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Workspaces</p>
                  {workspaceItems.map((item) => (
                    <Command.Item
                      key={item.href}
                      value={`${item.label} workspace`}
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
