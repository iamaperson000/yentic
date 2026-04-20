'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';

import SignedInHomeShell from '@/components/home/SignedInHomeShell';
import { AnimateIn } from '@/components/ui/AnimateIn';

const GITHUB_URL = 'https://github.com/iamaperson000/yentic';

type FeatureGroup = {
  title: string;
  items: string[];
};

const featureGroups: FeatureGroup[] = [
  {
    title: 'Editor',
    items: [
      'Syntax highlighting, autocomplete, multi-cursor, find and replace',
      'Multiple files per project with a file tree',
      'Tabs and keyboard navigation between open files',
      'Command palette — Cmd+K or Cmd+Shift+P',
      'A starter template for every language',
    ],
  },
  {
    title: 'Languages',
    items: [
      'Python, C, C++, Java, and web projects (HTML, CSS, JavaScript)',
      'Run your code and see output right next to it',
      'Give your program input through a console panel',
      'Web projects update as you type',
    ],
  },
  {
    title: 'Collaboration',
    items: [
      'Edit a file with someone else at the same time',
      'See who else is in the workspace',
      'Share a project with a link you can reset anytime',
      'Invite collaborators by username or email',
      'Editor and viewer roles',
    ],
  },
  {
    title: 'Saving your work',
    items: [
      'Your work saves to the browser automatically — no account needed',
      'Sign in to save projects to your account and open them from any device',
      'Pick up right where you left off',
    ],
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

function LandingHome() {
  return (
    <div className="-mt-12 flex flex-col sm:-mt-16">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]" />

        {/* Glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[420px] w-[680px] rounded-full bg-[var(--color-accent)]/[0.10] blur-[130px]" />

        <div className="relative mx-auto flex w-full max-w-[820px] flex-col items-center pb-24 pt-28 text-center sm:pb-28 sm:pt-36">
          <motion.span
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0 }}
            className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/55"
          >
            Yentic IDE
          </motion.span>

          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-5 max-w-[760px] text-display text-white"
          >
            Write Python, C, C++, Java, and web projects in your browser.
          </motion.h1>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-5 max-w-[560px] text-base leading-relaxed text-white/60 sm:text-lg"
          >
            Multiplayer editing, saved projects, and a shareable link for every workspace.
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/ide"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-200 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]"
            >
              Open IDE
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-white/70 transition hover:text-white"
            >
              Source on GitHub →
            </a>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <AnimateIn>
        <section className="relative border-t border-[var(--color-border-subtle)] py-24 sm:py-28">
          <div className="max-w-[760px]">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">
              Features
            </p>
            <h2 className="mt-4 text-title text-white">
              What&apos;s in it.
            </h2>
          </div>

          <div className="mt-14 grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
            {featureGroups.map((group) => (
              <article key={group.title}>
                <h3 className="text-[12px] uppercase tracking-[0.14em] text-white/45">
                  {group.title}
                </h3>
                <ul className="mt-5 space-y-3">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className="text-[14px] leading-[1.55] text-white/80"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="mt-16 flex flex-wrap items-center gap-5 border-t border-[var(--color-border-subtle)] pt-10">
            <Link
              href="/ide"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-200 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]"
            >
              Open IDE
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-white/70 transition hover:text-white"
            >
              GPL-3.0 on GitHub →
            </a>
          </div>
        </section>
      </AnimateIn>
    </div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="min-h-[40vh]" aria-hidden />;
  }

  if (status === 'authenticated' && session?.user) {
    return <SignedInHomeShell />;
  }

  return <LandingHome />;
}
