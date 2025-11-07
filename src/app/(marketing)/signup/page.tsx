'use client'

import Link from 'next/link'

import AuthStatus from '@/components/AuthStatus'
import { site } from '@/config/site'

const benefits = [
  {
    title: 'Kickstart instantly',
    body: 'Launch a new workspace with zero config and start building without waiting for local tooling.'
  },
  {
    title: 'Stay in sync',
    body: 'Your projects follow you—switch devices and keep momentum with automatic cloud saves (coming soon).'
  },
  {
    title: 'Collaborate smoothly',
    body: 'Invite teammates, share sandboxes, and pair program in a UI designed to stay out of the way.'
  }
]

const faqs = [
  {
    question: 'Can I use another provider besides Google?',
    answer:
      'Today we authenticate with Google while we roll out passwordless email. More providers are on the roadmap.'
  },
  {
    question: 'Is there a free tier?',
    answer: 'Yes. Sign up to start building for free and upgrade only when you need advanced collaboration features.'
  },
  {
    question: 'When will multiplayer ship?',
    answer: 'Multiplayer editing is in active development. New sign-ups get early access invites as we expand the beta.'
  }
]

export default function SignUpPage() {
  return (
    <div className="space-y-16">
      <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl shadow-emerald-500/10">
        <div className="flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-300/80">
            Create your account
          </span>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">Join Yentic in less than a minute.</h1>
          <p className="text-base text-white/70">
            Connect with Google to set up your workspace instantly. We will help you jump back into your projects wherever you
            left off, no install required.
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/30 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-white/50">Sign up with Google</p>
          <AuthStatus />
          <p className="text-xs text-white/50">
            By continuing you agree to our{' '}
            <Link
              href="/legal/terms"
              className="underline decoration-emerald-300/60 underline-offset-4 transition hover:text-white"
            >
              terms of service
            </Link>{' '}
            and{' '}
            <Link
              href="/legal/privacy"
              className="underline decoration-emerald-300/60 underline-offset-4 transition hover:text-white"
            >
              privacy policy
            </Link>
            .
          </p>
        </div>
      </div>

      <section className="grid gap-6 md:grid-cols-3">
        {benefits.map((benefit) => (
          <div key={benefit.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold text-white">{benefit.title}</h2>
            <p className="mt-3 text-sm text-white/60">{benefit.body}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/40 p-10">
        <div className="mb-8 flex flex-col gap-3">
          <h2 className="text-2xl font-semibold text-white">Frequently asked questions</h2>
          <p className="text-sm text-white/60">Still deciding? Here are the common questions from new builders.</p>
        </div>
        <dl className="space-y-6">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <dt className="text-sm font-semibold text-white">{faq.question}</dt>
              <dd className="mt-3 text-sm text-white/60">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-emerald-500/10 p-10 text-center">
        <h2 className="text-2xl font-semibold text-white">Want to see what we are building?</h2>
        <p className="text-sm text-white/70">
          Follow the roadmap to preview upcoming collaboration tools, or jump straight into the IDE to start a workspace.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/roadmap"
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
          >
            View roadmap
          </Link>
          <Link
            href="/ide"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black shadow-lg shadow-emerald-500/20 transition hover:bg-white/90"
          >
            Launch the IDE
          </Link>
        </div>
        <p className="text-xs text-white/50">
          Need help? Email{' '}
          <a
            className="underline decoration-emerald-300/60 underline-offset-4 transition hover:text-white"
            href={`mailto:${site.contactEmail}`}
          >
            {site.contactEmail}
          </a>
          .
        </p>
      </section>
    </div>
  )
}
