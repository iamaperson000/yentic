'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';

import SignedInHomeShell from '@/components/home/SignedInHomeShell';
import { site } from '@/config/site';

type HeroPoint = {
  title: string;
  detail: string;
};

type WorkflowStep = {
  step: string;
  title: string;
  description: string;
  bullets: string[];
};

type FeatureColumn = {
  title: string;
  items: string[];
};

const heroHighlights = [
  'Starters for Python, C, C++, Java, and web',
  'Monaco editor with tabs and file tree',
  'Live preview, console output, and input',
  'Autosave locally and share when ready',
];

const heroPoints: HeroPoint[] = [
  {
    title: 'Start in a proper workspace',
    detail:
      'Each project opens with a real editor, a file tree, and starter structure already in place.',
  },
  {
    title: 'Keep feedback beside the code',
    detail:
      'Web previews, runtime output, and program input stay in the same workspace instead of another tool.',
  },
  {
    title: 'Share only when it matters',
    detail:
      'You can begin without an account, save to your profile later, and send a link when the project is ready.',
  },
];

const workflowSteps: WorkflowStep[] = [
  {
    step: '01',
    title: 'Open a project and start writing immediately.',
    description:
      'Choose a language starter and land in Monaco with the workspace structure already prepared.',
    bullets: [
      'Python, C, C++, Java, and web projects are available from the first click.',
      'Multi-file tabs and file tree navigation keep larger projects manageable.',
      'Autocomplete, find and replace, and multi-cursor editing are built in.',
    ],
  },
  {
    step: '02',
    title: 'Run the code without breaking your flow.',
    description:
      'The editor, preview, and output stay together, so you can iterate without bouncing between windows.',
    bullets: [
      'Web projects update as you type.',
      'Console programs can accept input directly in the workspace.',
      'Output stays close enough to the code to make debugging faster.',
    ],
  },
  {
    step: '03',
    title: 'Keep the work and hand it off cleanly.',
    description:
      'Start quickly in the browser, then move into a saved or shared workspace once the project becomes worth keeping.',
    bullets: [
      'Projects save to the browser automatically, even before sign-in.',
      'Accounts let you reopen work from any device.',
      'Share links and collaborator roles are available when the project becomes a team effort.',
    ],
  },
];

const featureColumns: FeatureColumn[] = [
  {
    title: 'Editing',
    items: [
      'Syntax highlighting and autocomplete',
      'Multi-file tabs and file tree',
      'Find and replace',
      'Command palette',
    ],
  },
  {
    title: 'Running',
    items: [
      'Live web preview',
      'Console output',
      'Program input',
      'Language starters',
    ],
  },
  {
    title: 'Saving and sharing',
    items: [
      'Browser autosave',
      'Projects on your account',
      'Shareable links',
      'Viewer and editor roles',
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
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.26),transparent_56%)]" />
        <div className="pointer-events-none absolute right-[8%] top-[18%] h-[320px] w-[320px] rounded-full bg-white/[0.05] blur-[120px]" />

        <div className="relative mx-auto grid w-full max-w-[1240px] gap-14 pb-24 pt-24 sm:pb-28 sm:pt-28 lg:grid-cols-[minmax(0,1.15fr)_340px] lg:gap-16">
          <div className="max-w-[760px] text-center lg:text-left">
            <motion.h1
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="max-w-[820px] text-display text-white"
            >
              Build, run, and share code in your browser.
            </motion.h1>

            <motion.p
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mt-6 max-w-[620px] text-base leading-relaxed text-white/68 sm:text-lg"
            >
              Yentic is a fast browser IDE for Python, C, C++, Java, and web
              projects. Open a starter in seconds, keep output beside the
              editor, and share the workspace when you need feedback.
            </motion.p>

            <motion.div
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
            >
              <Link
                href="/ide"
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-200 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]"
              >
                Open IDE
              </Link>
              <Link
                href="/features"
                className="rounded-full border border-white/15 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-white/88 transition hover:border-white/30 hover:bg-white/[0.06]"
              >
                See how it works
              </Link>
            </motion.div>

            <motion.ul
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="mt-10 grid gap-3 border-t border-white/10 pt-6 text-left sm:grid-cols-2 lg:grid-cols-4"
            >
              {heroHighlights.map((item) => (
                <li
                  key={item}
                  className="text-[13px] leading-[1.5] text-white/70"
                >
                  {item}
                </li>
              ))}
            </motion.ul>
          </div>

          <motion.aside
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="border-t border-white/10 pt-6 text-left lg:mt-18 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
          >
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/48">
              Why Yentic
            </p>

            <div className="mt-6 space-y-6">
              {heroPoints.map((point) => (
                <div
                  key={point.title}
                  className="border-b border-white/10 pb-6 last:border-b-0 last:pb-0"
                >
                  <h2 className="text-[20px] font-medium leading-[1.12] tracking-[-0.03em] text-white">
                    {point.title}
                  </h2>
                  <p className="mt-2 text-[14px] leading-[1.6] text-white/62">
                    {point.detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
              <span className="text-white/48">Open source</span>
                <a
                  href={site.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-white/78 transition hover:text-white"
              >
                View on GitHub →
              </a>
            </div>
          </motion.aside>
        </div>
      </section>

      {/* Flow */}
      <section className="relative overflow-hidden border-y border-[var(--color-light-border)] bg-[var(--color-light-bg)] text-[var(--color-bg-surface)]">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(19,25,35,0.11)_1px,transparent_1px)] [background-size:26px_26px]" />

        <div className="relative px-6 py-12 sm:px-8 sm:py-14">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[760px]">
              <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[var(--color-light-muted)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-light-muted)]" />
                How It Works
              </p>
              <h2 className="mt-4 text-title text-[#0f1621]">
                From first draft to shared workspace.
              </h2>
            </div>
            <p className="max-w-[520px] text-[15px] leading-[1.6] text-[#273446]/85">
              Yentic is built for the stretch between &quot;let me try
              something&quot; and &quot;send me the link.&quot; It gets you into
              a real workspace quickly, keeps feedback close, and makes the
              handoff simple.
            </p>
          </div>

          <div className="mt-12 divide-y divide-[var(--color-light-border)] border-y border-[var(--color-light-border)]">
            {workflowSteps.map((step) => (
              <article
                key={step.title}
                className="grid gap-6 py-8 lg:grid-cols-[72px_minmax(0,1fr)_380px] lg:gap-10"
              >
                <div className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[var(--color-light-muted)]">
                  {step.step}
                </div>

                <div>
                  <h3 className="text-[26px] font-medium leading-[1.1] tracking-[-0.03em] text-[#101a27] sm:text-[30px]">
                    {step.title}
                  </h3>
                  <p className="mt-4 max-w-[42ch] text-[15px] leading-[1.65] text-[#273446]/85">
                    {step.description}
                  </p>
                </div>

                <ul className="space-y-3 lg:pt-1">
                  {step.bullets.map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 text-[14px] leading-[1.6] text-[#253243]"
                    >
                      <span className="mt-[8px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#445162]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="mt-12 grid gap-10 border-t border-[var(--color-light-border)] pt-10 lg:grid-cols-[280px_repeat(3,minmax(0,1fr))]">
            <div className="max-w-[260px]">
              <p className="text-[12px] uppercase tracking-[0.14em] text-[var(--color-light-muted)]">
                Included Today
              </p>
              <p className="mt-3 text-[15px] leading-[1.6] text-[#273446]/85">
                The essentials are already here: editing tools, quick feedback,
                and a simple path from local work to shared work.
              </p>
            </div>

            {featureColumns.map((column) => (
              <div key={column.title}>
                <p className="text-[12px] uppercase tracking-[0.14em] text-[var(--color-light-muted)]">
                  {column.title}
                </p>
                <ul className="mt-4 space-y-3">
                  {column.items.map((item) => (
                    <li
                      key={item}
                      className="text-[14px] leading-[1.6] text-[#253243]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-5 border-t border-[var(--color-light-border)] pt-8">
            <Link
              href="/ide"
              className="rounded-full bg-[#131923] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0e141d]"
            >
              Open IDE
            </Link>
            <Link
              href="/features"
              className="text-sm font-medium text-[#273446]/80 transition hover:text-[#101a27]"
            >
              View all features →
            </Link>
          </div>
        </div>
      </section>
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
