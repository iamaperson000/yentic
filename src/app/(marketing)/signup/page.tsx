'use client';

import Link from 'next/link';

import AuthStatus from '@/components/AuthStatus';
import { site } from '@/config/site';
import { AnimateIn } from '@/components/ui/AnimateIn';

const benefits = [
  {
    title: 'Kickstart instantly',
    body: 'Pick a language and start writing code. No installs, no configuration.'
  },
  {
    title: 'Stay in sync',
    body: 'Cloud saves are in development. Once live, your projects will be available from any browser.'
  },
  {
    title: 'Collaborate smoothly',
    body: 'Collaboration features are coming soon. Share links and real-time editing are on the roadmap.'
  }
];

const faqs = [
  {
    question: 'Can I use another provider besides Google?',
    answer:
      'Today we authenticate with Google while passwordless email sign-in is in development. Additional providers are planned.'
  },
  {
    question: 'Is there a free tier?',
    answer: 'Yes. You can start building for free and upgrade later when you need advanced collaboration capabilities.'
  },
  {
    question: 'When will multiplayer ship?',
    answer: 'Multiplayer editing is in active development. New sign-ups are prioritized for early beta invites.'
  }
];

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-16">
      <AnimateIn delay={0}>
        <section className="relative overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />

          <div className="relative lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
            <div className="border-b border-[var(--color-border-medium)] px-6 py-10 sm:px-8 sm:py-12 lg:border-b-0 lg:border-r">
              <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-text-muted)]" />
                Create your account
              </p>
              <h1 className="mt-4 text-[34px] font-medium leading-[1.05] tracking-[-0.04em] text-[var(--color-text-primary)] sm:text-[48px] lg:text-[56px]">
                Join Yentic in less than a minute.
              </h1>
              <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.55] text-[var(--color-text-secondary)]">
                Connect with Google to set up your workspace instantly and resume your projects from anywhere.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/ide" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-200">
                  Launch IDE now
                </Link>
                <Link
                  href="/roadmap"
                  className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white/40"
                >
                  View roadmap
                </Link>
              </div>
            </div>

            <div className="px-6 py-10 sm:px-8 sm:py-12">
              <div className="rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-surface)] p-5">
                <p className="text-[12px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Sign in with Google</p>
                <div className="mt-4">
                  <AuthStatus />
                </div>
                <p className="mt-4 text-[12px] leading-[1.55] text-[var(--color-text-faint)]">
                  By continuing, you agree to our{' '}
                  <Link className="underline decoration-[var(--color-text-muted)] underline-offset-4 transition hover:text-white" href="/terms">
                    terms of service
                  </Link>{' '}
                  and{' '}
                  <Link className="underline decoration-[var(--color-text-muted)] underline-offset-4 transition hover:text-white" href="/privacy">
                    privacy policy
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>
      </AnimateIn>

      <AnimateIn delay={0.1}>
        <section className="relative overflow-hidden rounded-[10px] border border-[#bfc9d6] bg-[var(--color-light-bg)] text-[var(--color-bg-surface)]">
          <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(19,25,35,0.11)_1px,transparent_1px)] [background-size:26px_26px]" />

          <div className="relative border-b border-[var(--color-light-border)] px-6 py-10 sm:px-8 sm:py-12">
            <div className="max-w-[760px]">
              <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[var(--color-light-muted)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-light-muted)]" />
                Why sign up
              </p>
              <h2 className="mt-4 text-[30px] font-medium leading-[1.05] tracking-[-0.04em] text-[#0f1621] sm:text-[40px] lg:text-[48px]">
                What you get with an account.
              </h2>
            </div>
          </div>

          <div className="relative grid gap-px bg-[var(--color-light-border)] md:grid-cols-3">
            {benefits.map(benefit => (
              <article key={benefit.title} className="bg-[var(--color-light-bg)] px-6 py-7 sm:px-8 sm:py-8">
                <h3 className="text-[22px] font-medium leading-[1.2] tracking-[-0.02em] text-[#101a27]">{benefit.title}</h3>
                <p className="mt-3 text-[14px] leading-[1.6] text-[#273446]/85">{benefit.body}</p>
              </article>
            ))}
          </div>
        </section>
      </AnimateIn>

      <AnimateIn delay={0.2}>
        <section className="relative overflow-hidden rounded-[10px] border border-[#2d3643] bg-[var(--color-bg-overlay)]">
          <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(to_right,rgba(220,229,240,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(220,229,240,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="relative px-6 py-10 sm:px-8 sm:py-12">
            <div className="max-w-[760px]">
              <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-text-muted)]" />
                Common questions
              </p>
              <h2 className="mt-4 text-[30px] font-medium leading-[1.05] tracking-[-0.04em] text-[var(--color-text-primary)] sm:text-[40px]">
                Common questions.
              </h2>
            </div>

            <dl className="mt-8 divide-y divide-[var(--color-border-medium)] overflow-hidden rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-surface)]">
              {faqs.map(faq => (
                <div key={faq.question} className="px-5 py-5">
                  <dt className="text-[15px] font-medium text-[var(--color-text-primary)]">{faq.question}</dt>
                  <dd className="mt-2 text-[14px] leading-[1.55] text-[var(--color-text-secondary)]">{faq.answer}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 text-[13px] leading-[1.6] text-[var(--color-text-faint)]">
              Need help? Email{' '}
              <a className="underline decoration-[var(--color-text-muted)] underline-offset-4 transition hover:text-white" href={`mailto:${site.contactEmail}`}>
                {site.contactEmail}
              </a>
              .
            </p>
          </div>
        </section>
      </AnimateIn>
    </div>
  );
}
