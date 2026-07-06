'use client';

import Link from 'next/link';

import AuthStatus from '@/components/AuthStatus';
import { site } from '@/config/site';
import { AnimateIn } from '@/components/ui/AnimateIn';

const benefits = [
  {
    title: 'Start fast',
    body: 'Pick a language and start writing code right away.'
  },
  {
    title: 'Stay in sync',
    body: 'Cloud saves are in development. Once live, your projects will be available from any browser.'
  },
  {
    title: 'Collaborate smoothly',
    body: 'Share a project with a link, and choose who can view or edit it.'
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
    <div className="flex flex-col gap-14">
      <AnimateIn delay={0}>
        <section
          className="overflow-hidden rounded-[14px] border lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch"
          style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)' }}
        >
          <div className="border-b px-6 py-10 sm:px-8 sm:py-12 lg:border-b-0 lg:border-r" style={{ borderColor: 'var(--y-line)' }}>
            <p className="font-[family-name:var(--font-mono-code)] text-[12.5px]" style={{ color: 'var(--y-brand)' }}>
              # create your account
            </p>
            <h1
              className="mt-4 font-[family-name:var(--font-display)] text-[clamp(30px,4.5vw,48px)] font-extrabold leading-[1.03] tracking-[-0.035em]"
              style={{ color: 'var(--y-fg)' }}
            >
              Join Yentic and start building.
            </h1>
            <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.6]" style={{ color: 'var(--y-muted)' }}>
              Sign in with Google to set up your workspace and pick up your projects from any browser.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 font-[family-name:var(--font-mono-code)] text-[13px]">
              <Link
                href="/ide"
                className="rounded-[9px] px-5 py-2.5 font-semibold"
                style={{ background: 'var(--y-brand)', color: 'var(--y-statfg)' }}
              >
                Launch the IDE
              </Link>
              <Link
                href="/roadmap"
                className="rounded-[9px] border px-5 py-2.5 font-semibold"
                style={{ borderColor: 'var(--y-line)', color: 'var(--y-fg)' }}
              >
                View roadmap
              </Link>
            </div>
          </div>

          <div className="px-6 py-10 sm:px-8 sm:py-12">
            <div className="rounded-lg border p-5" style={{ borderColor: 'var(--y-line)', background: 'var(--y-ink)' }}>
              <p className="font-[family-name:var(--font-mono-code)] text-xs" style={{ color: 'var(--y-muted)' }}>
                Sign in with Google
              </p>
              <div className="mt-4">
                <AuthStatus />
              </div>
              <p className="mt-4 text-[12px] leading-[1.55]" style={{ color: 'var(--y-muted)' }}>
                By continuing, you agree to our{' '}
                <Link className="underline underline-offset-4" style={{ color: 'var(--y-brand)' }} href="/terms">
                  terms of service
                </Link>{' '}
                and{' '}
                <Link className="underline underline-offset-4" style={{ color: 'var(--y-brand)' }} href="/privacy">
                  privacy policy
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </AnimateIn>

      <AnimateIn delay={0.1}>
        <section
          className="overflow-hidden rounded-[12px] border"
          style={{ borderColor: 'var(--y-line)', background: 'var(--y-ink)' }}
        >
          <div className="border-b px-6 py-7 sm:px-8" style={{ borderColor: 'var(--y-line)' }}>
            <p className="font-[family-name:var(--font-mono-code)] text-[12.5px]" style={{ color: 'var(--y-brand)' }}>
              # why sign up
            </p>
            <h2
              className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.02em]"
              style={{ color: 'var(--y-fg)' }}
            >
              What you get with an account.
            </h2>
          </div>
          <div className="grid gap-px md:grid-cols-3" style={{ background: 'var(--y-line)' }}>
            {benefits.map((benefit) => (
              <article key={benefit.title} className="px-6 py-7 sm:px-8" style={{ background: 'var(--y-ink)' }}>
                <h3
                  className="font-[family-name:var(--font-display)] text-lg font-bold tracking-[-0.02em]"
                  style={{ color: 'var(--y-fg)' }}
                >
                  {benefit.title}
                </h3>
                <p className="mt-3 text-sm leading-[1.6]" style={{ color: 'var(--y-muted)' }}>
                  {benefit.body}
                </p>
              </article>
            ))}
          </div>
        </section>
      </AnimateIn>

      <AnimateIn delay={0.2}>
        <section
          className="rounded-[12px] border px-6 py-10 sm:px-8"
          style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)' }}
        >
          <p className="font-[family-name:var(--font-mono-code)] text-[12.5px]" style={{ color: 'var(--y-brand)' }}>
            # common questions
          </p>
          <h2
            className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.02em]"
            style={{ color: 'var(--y-fg)' }}
          >
            Common questions.
          </h2>

          <dl className="mt-8 overflow-hidden rounded-lg border" style={{ borderColor: 'var(--y-line)', background: 'var(--y-ink)' }}>
            {faqs.map((faq) => (
              <div key={faq.question} className="border-b px-5 py-5 last:border-b-0" style={{ borderColor: 'var(--y-line)' }}>
                <dt className="text-[15px] font-semibold" style={{ color: 'var(--y-fg)' }}>
                  {faq.question}
                </dt>
                <dd className="mt-2 text-sm leading-[1.55]" style={{ color: 'var(--y-muted)' }}>
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 text-[13px] leading-[1.6]" style={{ color: 'var(--y-muted)' }}>
            Need help? Email{' '}
            <a className="underline underline-offset-4" style={{ color: 'var(--y-brand)' }} href={`mailto:${site.contactEmail}`}>
              {site.contactEmail}
            </a>
            .
          </p>
        </section>
      </AnimateIn>
    </div>
  );
}
