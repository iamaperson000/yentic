'use client'

import Link from 'next/link'
import AuthStatus from '@/components/AuthStatus'
import { useSession, signIn } from 'next-auth/react'
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
  const { data: session } = useSession()
  const isAuthed = Boolean(session?.user)
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
            {!isAuthed && (
              <button
                onClick={() => signIn('google')}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-white/10 transition hover:bg-white/90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,14,24,14c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C34.046,6.053,29.268,4,24,4C15.74,4,8.785,8.735,6.306,14.691z"/>
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36 c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C8.635,39.229,15.731,44,24,44z"/>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.793,2.237-2.231,4.166-4.093,5.571 c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}
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
