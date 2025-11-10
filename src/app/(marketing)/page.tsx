'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';

import { site } from '@/config/site';
import AuthStatus from '@/components/AuthStatus';
import { workspaceList, type WorkspaceSlug } from '@/lib/project';

const marketingHighlights = [
  {
    title: 'Instant launch',
    body: 'Spin up a fresh workspace in seconds with zero config and an interface tuned for builders.',
  },
  {
    title: 'Live preview',
    body: 'Sandpack-powered preview mirrors every keystroke so you can ship UI changes without guessing.',
  },
  {
    title: 'Cloud persistence',
    body: 'Projects sync to the cloud so you can swap devices without losing context.',
  },
];

const marketingWorkflow = [
  {
    label: 'Create',
    description:
      'Start with the opinionated HTML/CSS/JS starter or import your own repo via GitHub.',
  },
  {
    label: 'Collaborate',
    description:
      'Invite teammates into the same workspace and pair program in real time (multiplayer in progress).',
  },
  {
    label: 'Ship',
    description:
      'Deploy through your provider of choice with export-ready bundles and build logs.',
  },
];

const snippetLines = [
  (
    <>
      <span className="text-emerald-300">const</span> workspace = createWorkspace(&apos;yentic&apos;);
    </>
  ),
  (
    <>
      workspace.launch({`{`} autosave: true, preview: &apos;sandpack&apos; {`}`});
    </>
  ),
  <>{'// minimal UI, zero distractions'}</>,
  <>workspace.share(&apos;team&apos;);</>,
];

const accentCardGradients: Record<WorkspaceSlug, string> = {
  web: 'from-emerald-300/30 via-emerald-400/10 to-transparent',
  python: 'from-sky-300/30 via-sky-400/10 to-transparent',
  c: 'from-violet-300/30 via-violet-400/10 to-transparent',
  cpp: 'from-violet-300/30 via-violet-400/10 to-transparent',
  java: 'from-amber-300/30 via-amber-400/10 to-transparent',
};

function MarketingLanding() {
  return (
    <>
      <section className="grid gap-10 md:grid-cols-[1.15fr_0.85fr] md:items-center">
        <div className="flex flex-col gap-6">
          <span className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-300/80">
            Introducing Yentic
          </span>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            A lightweight, fast, and aesthetic web IDE that feels instantly familiar.
          </h1>
          <p className="text-lg text-white/70">
            Edit, preview, and share projects instantly with a minimal interface,
            multiplayer-ready foundation, and thoughtful defaults. Yentic keeps the
            tooling out of your way so you can stay in flow.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/ide"
              className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-black shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
            >
              Launch the IDE
            </Link>
            <Link
              href="/features"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
            >
              Explore the features
            </Link>
            <Link
              href="/dev-test"
              className="rounded-full border border-emerald-400/40 px-6 py-3 text-sm font-semibold text-emerald-200 transition hover:border-emerald-300/80 hover:text-emerald-100"
            >
              Try the Pulseboard lab
            </Link>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-emerald-500/10">
          <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/40">
            <span>Live preview</span>
            <span>Sandpack</span>
          </div>
          <div className="space-y-3 text-sm text-white/70">
            {snippetLines.map((line, index) => (
              <p key={index} className="font-mono tracking-tight">
                {line}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {marketingHighlights.map(item => (
          <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-white">{item.title}</h3>
            <p className="mt-3 text-sm text-white/60">{item.body}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/40 p-10">
        <div className="mb-10 max-w-3xl">
          <h2 className="text-3xl font-semibold">Build flow that matches your muscle memory.</h2>
          <p className="mt-4 text-base text-white/60">
            We obsess over the little details: keyboard shortcuts that make sense, autosave that respects your intent, and
            environment defaults tuned for shipping web experiences fast.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {marketingWorkflow.map(step => (
            <div key={step.label} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <span className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">{step.label}</span>
              <p className="mt-3 text-sm text-white/70">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-emerald-500/10 p-10">
        <h2 className="text-3xl font-semibold">Ready when you are</h2>
        <p className="text-base text-white/70">
          Create your account with Google or email, invite collaborators, and let Yentic keep your projects synced across
          devices. Multiplayer editing, build logs, and workspace history are rolling out over the next few sprints.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/roadmap"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            View the roadmap
          </Link>
          <a
            href={`mailto:${site.contactEmail}`}
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
          >
            Request access
          </a>
        </div>
      </section>
    </>
  );
}

function AuthenticatedHome({ userName }: { userName: string }) {
  const firstName = userName.split(' ')[0] ?? 'there';

  return (
    <div className="flex flex-col gap-10">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-8 shadow-xl shadow-emerald-500/10 sm:p-10">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.15),_transparent_55%)]" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
              Welcome back
            </span>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              Hey {firstName}, let&apos;s ship something new.
            </h1>
            <p className="max-w-2xl text-sm text-white/70 sm:text-base">
              Launch a fresh project, name it, and start building. Need to revisit something? Load any saved cloud project in just a couple of clicks.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/ide"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
              >
                Choose a workspace
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/ide#saved-projects"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
              >
                Load a saved project
              </Link>
            </div>
          </div>
          <div className="mt-6 w-full max-w-sm lg:mt-0">
            <AuthStatus />
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Start a new project</h2>
            <p className="text-sm text-white/60">Pick a workspace and we&apos;ll ask for a project name as soon as it opens.</p>
          </div>
          <Link
            href="/ide"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
          >
            View all workspaces
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspaceList.map(workspace => (
            <Link
              key={workspace.slug}
              href={`/ide/${workspace.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/10"
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
                <div className={`absolute inset-0 bg-gradient-to-br ${accentCardGradients[workspace.slug]}`} />
              </div>
              <div className="relative space-y-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70">
                  Workspace
                </span>
                <h3 className="text-lg font-semibold text-white">{workspace.title}</h3>
                <p className="text-sm text-white/60">{workspace.description}</p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-200">
                  Create project
                  <span aria-hidden className="transition group-hover:translate-x-1">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/40 p-10">
        <div className="mb-10 max-w-3xl">
          <h2 className="text-3xl font-semibold">Build flow that matches your muscle memory.</h2>
          <p className="mt-4 text-base text-white/60">
            We obsess over the little details: keyboard shortcuts that make sense, autosave that respects your intent, and environment defaults tuned for shipping web experiences fast.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {marketingWorkflow.map(step => (
            <div key={step.label} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <span className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">{step.label}</span>
              <p className="mt-3 text-sm text-white/70">{step.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();

  if (status !== 'authenticated' || !session?.user) {
    return <MarketingLanding />;
  }

  const displayName = session.user.name ?? session.user.email ?? 'there';
  return <AuthenticatedHome userName={displayName} />;
}
