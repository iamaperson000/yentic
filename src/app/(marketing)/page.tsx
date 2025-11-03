'use client'

import Link from 'next/link'
import AuthStatus from '@/components/AuthStatus'
import { site } from '@/config/site'

const highlights = [
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
    body: 'Projects sync to the cloud (coming soon) so you can swap devices without losing context.',
  },
]

const workflowSteps = [
  {
    label: '1. Create',
    description:
      'Start with the opinionated HTML/CSS/JS starter or import your own repo via GitHub.',
  },
  {
    label: '2. Collaborate',
    description:
      'Invite teammates into the same workspace and pair program in real time (multiplayer in progress).',
  },
  {
    label: '3. Ship',
    description:
      'Deploy through your provider of choice with export-ready bundles and build logs.',
  },
]

const snippetLines = [
  (
    <>
      <span className="text-emerald-300">const</span> workspace =
      createWorkspace(&apos;yentic&apos;);
    </>
  ),
  (
    <>
      workspace.launch({`{`} autosave: true, preview: &apos;sandpack&apos; {`}`});
    </>
  ),
  <>{'// minimal UI, zero distractions'}</>,
  <>workspace.share(&apos;team&apos;);</>,
]

export default function MarketingHome() {
  return (
    <>
      {/* ✅ Sign-in bar at the top */}
      <div className="flex justify-end mb-6">
        <AuthStatus />
      </div>

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
        {highlights.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <h3 className="text-lg font-semibold text-white">{item.title}</h3>
            <p className="mt-3 text-sm text-white/60">{item.body}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/40 p-10">
        <div className="mb-10 max-w-3xl">
          <h2 className="text-3xl font-semibold">
            Build flow that matches your muscle memory.
          </h2>
          <p className="mt-4 text-base text-white/60">
            We obsess over the little details: keyboard shortcuts that make sense,
            autosave that respects your intent, and environment defaults tuned for
            shipping web experiences fast.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {workflowSteps.map((step) => (
            <div
              key={step.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <span className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">
                {step.label}
              </span>
              <p className="mt-3 text-sm text-white/70">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-emerald-500/10 p-10">
        <h2 className="text-3xl font-semibold">Ready when you are</h2>
        <p className="text-base text-white/70">
          Create your account with Google or email, invite collaborators, and let
          Yentic keep your projects synced across devices. Multiplayer editing,
          build logs, and workspace history are rolling out over the next few
          sprints.
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
            Request early access
          </a>
        </div>
      </section>
    </>
  )
}
