'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';

import AuthStatus from '@/components/AuthStatus';
import { workspaceList, type WorkspaceSlug } from '@/lib/project';

const workflowSteps = [
  {
    step: '01',
    title: 'Open and start coding',
    body: 'Pick a runtime and jump into a real project immediately.',
  },
  {
    step: '02',
    title: 'Edit with full context',
    body: 'Use Monaco, tabbed files, and quick keyboard navigation.',
  },
  {
    step: '03',
    title: 'Validate and keep moving',
    body: 'Preview changes live and resume work from saved projects later.',
  },
];

const detailRows = [
  { label: 'Editor', value: 'Monaco, tabs, shortcuts, and quick file workflow.' },
  { label: 'Preview', value: 'Live updates while code changes are still in progress.' },
  { label: 'Runtime', value: 'Web, Python, C, C++, and Java workspaces in one launcher.' },
  { label: 'History', value: 'Project state persists so you can reopen exactly where you left off.' },
];

const planningCards = [
  { stage: 'Now', notes: 'Core editing, preview, and saved project flow are stable.' },
  { stage: 'Next', notes: 'Cleaner project controls and easier personal organization.' },
  { stage: 'Later', notes: 'Simple publish and share options for finished projects.' },
];

const workspaceTint: Record<WorkspaceSlug, string> = {
  web: 'from-emerald-300/25 to-transparent',
  python: 'from-cyan-300/25 to-transparent',
  c: 'from-orange-300/25 to-transparent',
  cpp: 'from-amber-300/25 to-transparent',
  java: 'from-sky-300/25 to-transparent',
};

function LandingHome() {
  return (
    <div className="flex flex-col gap-24">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#07090d]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.55] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />

        <div className="relative mx-auto flex w-full max-w-[920px] flex-col items-center px-6 pb-14 pt-24 text-center sm:pb-20 sm:pt-32">
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/70">
            Yentic IDE
          </span>

          <h1 className="mt-6 max-w-[700px] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] text-white sm:text-[58px] lg:text-[70px]">
            Build and iterate from one browser workspace.
          </h1>

          <p className="mt-5 max-w-[620px] text-base leading-relaxed text-white/65 sm:text-lg">
            A lightweight and fast web IDE that feels instantly familiar.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/ide"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-200"
            >
              Open IDE
            </Link>
            <Link
              href="/features"
              className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white/40"
            >
              Product details
            </Link>
          </div>
        </div>

      </section>

      <section className="relative overflow-hidden rounded-[10px] border border-[#bfc9d6] bg-[#dce5f0] text-[#131923]">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(19,25,35,0.11)_1px,transparent_1px)] [background-size:26px_26px]" />

        <div className="relative border-b border-[#b5c0ce] px-6 py-10 sm:px-8 sm:py-12">
          <div className="max-w-[760px]">
            <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[#445162]">
              <span className="h-2 w-2 rounded-full bg-[#445162]" />
              Workflow
            </p>
            <h2 className="mt-4 text-[30px] font-medium leading-[1.05] tracking-[-0.04em] text-[#0f1621] sm:text-[42px] lg:text-[52px]">
              A tighter build loop from first file to final review.
            </h2>
          </div>
        </div>

        <div className="relative grid md:grid-cols-3">
          {workflowSteps.map((item, index) => (
            <article
              key={item.title}
              className={`px-6 py-7 sm:px-8 sm:py-8 ${index < workflowSteps.length - 1 ? 'border-b border-[#b5c0ce] md:border-b-0 md:border-r' : ''}`}
            >
              <p className="text-[12px] font-medium text-[#4f5d6f]">{item.step}</p>
              <h3 className="mt-3 text-[22px] font-medium leading-[1.2] tracking-[-0.02em] text-[#101a27]">{item.title}</h3>
              <p className="mt-3 max-w-[34ch] text-[14px] leading-[1.6] text-[#273446]/85">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[10px] border border-[#2d3643] bg-[#171d27]">
        <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_20%_0%,rgba(220,229,240,0.2),transparent_48%),linear-gradient(to_right,rgba(220,229,240,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(220,229,240,0.08)_1px,transparent_1px)] [background-size:auto,48px_48px,48px_48px]" />

        <div className="relative lg:grid lg:grid-cols-[1.2fr_0.8fr]">
          <div className="border-b border-[#2f3a4a] px-6 py-9 sm:px-8 sm:py-10 lg:border-b-0 lg:border-r">
            <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[#9fb0c4]">
              <span className="h-2 w-2 rounded-full bg-[#93a8bf]" />
              Product
            </p>
            <h2 className="mt-4 max-w-[660px] text-[30px] font-medium leading-[1.05] tracking-[-0.04em] text-[#edf3fb] sm:text-[40px] lg:text-[48px]">
              Expanded details for people who actually build.
            </h2>
            <p className="mt-4 max-w-[58ch] text-[15px] leading-[1.55] text-[#b8c5d6]">
              The structure stays simple: split columns, line-separated rows, and direct language.
            </p>

            <div className="mt-8 overflow-hidden rounded-lg border border-[#2f3a4a] bg-[#141b25]">
              {detailRows.map(item => (
                <div
                  key={item.label}
                  className="grid gap-2 border-b border-[#2f3a4a] px-5 py-4 last:border-b-0 sm:grid-cols-[104px_minmax(0,1fr)] sm:gap-4"
                >
                  <p className="text-[12px] uppercase tracking-[0.12em] text-[#8ea0b6]">{item.label}</p>
                  <p className="text-[14px] leading-[1.55] text-[#d3dfee]">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/ide"
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-200"
              >
                Open IDE
              </Link>
              <Link
                href="/features"
                className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white/40"
              >
                Product details
              </Link>
            </div>
          </div>

          <div className="px-6 py-9 sm:px-8 sm:py-10">
            <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[#9fb0c4]">
              <span className="h-2 w-2 rounded-full bg-[#93a8bf]" />
              Release track
            </p>
            <div className="mt-5 overflow-hidden rounded-lg border border-[#2f3a4a] bg-[#131923]">
              {planningCards.map(item => (
                <article key={item.stage} className="border-b border-[#2f3a4a] px-5 py-5 last:border-b-0">
                  <p className="text-[12px] uppercase tracking-[0.12em] text-[#8ea0b6]">{item.stage}</p>
                  <p className="mt-2 text-[14px] leading-[1.55] text-[#c6d4e4]">{item.notes}</p>
                </article>
              ))}
            </div>

            <p className="mt-6 text-[13px] leading-[1.6] text-[#9fb0c4]">
              Focus: faster editing and less friction between idea and outcome.
            </p>
          </div>
        </div>

      </section>
    </div>
  );
}

function AuthenticatedHome({ userName }: { userName: string }) {
  const firstName = userName.split(' ')[0] ?? 'there';

  return (
    <div className="flex flex-col gap-14">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#07090d] p-8 sm:p-10">
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/70">
              Welcome back
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.03em] text-white">{firstName}, continue building.</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">
              Start a new project or reopen a saved one.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/ide"
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-200"
              >
                New project
              </Link>
              <Link
                href="/ide#saved-projects"
                className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white/40"
              >
                Saved projects
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/35 p-4">
            <AuthStatus />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-white">Choose a workspace</h2>
            <p className="mt-1 text-sm text-white/65">Open a runtime and start coding.</p>
          </div>
          <Link
            href="/ide"
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/75 transition hover:border-white/40"
          >
            Browse all
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspaceList.map(workspace => (
            <Link
              key={workspace.slug}
              href={`/ide/${workspace.slug}`}
              className="group overflow-hidden rounded-xl border border-white/10 bg-[#0b0e13] transition hover:border-white/25"
            >
              <div className={`h-28 border-b border-white/10 bg-gradient-to-br ${workspaceTint[workspace.slug]}`} />
              <div className="space-y-3 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">Workspace</p>
                <h3 className="text-lg font-semibold text-white">{workspace.title}</h3>
                <p className="text-sm leading-relaxed text-white/65">{workspace.description}</p>
                <p className="text-sm font-semibold text-white/90">
                  Create project <span aria-hidden>→</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();

  if (status !== 'authenticated' || !session?.user) {
    return <LandingHome />;
  }

  const displayName = session.user.name ?? session.user.email ?? 'there';
  return <AuthenticatedHome userName={displayName} />;
}
