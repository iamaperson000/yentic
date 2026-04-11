import Link from 'next/link';

import { site } from '@/config/site';

const updatedOn = 'April 12, 2024';

const sections = [
  {
    title: '1. Information we collect',
    body: 'We collect the details you provide when creating an account, such as your name and email address.'
  },
  {
    title: '2. How we use your data',
    body:
      'We use your data for authentication, saving your projects, and basic usage analytics to improve the product.'
  },
  {
    title: '3. Sharing your information',
    body:
      'We do not sell your data. We only share it with trusted providers that help us deliver the service, including hosting, authentication, and analytics partners under confidentiality agreements.'
  },
  {
    title: '4. Data retention',
    body:
      'We retain your projects and account data while your account remains active. You can request deletion of your data by contacting support.'
  },
  {
    title: '5. Your choices',
    body:
      'You can request access, updates, or deletion of your information at any time. Adjust your notification settings in-app or reach out directly for additional preferences.'
  },
  {
    title: '6. Updates to this policy',
    body:
      'We may update this Privacy Policy occasionally. Significant changes are announced through email or prominent in-app notices.'
  }
];

export default function PrivacyPage() {
  return (
    <div className="flex flex-col gap-16">
      <section className="relative overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative max-w-[920px] px-6 py-14 sm:px-8 sm:py-16">
          <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
            <span className="h-2 w-2 rounded-full bg-[var(--color-text-muted)]" />
            Legal
          </p>
          <h1 className="mt-4 text-[34px] font-medium leading-[1.05] tracking-[-0.04em] text-[var(--color-text-primary)] sm:text-[48px] lg:text-[56px]">
            Privacy Policy
          </h1>
          <p className="mt-3 text-[12px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Last updated {updatedOn}</p>
          <p className="mt-4 max-w-[68ch] text-[15px] leading-[1.55] text-[var(--color-text-secondary)]">
            This policy explains how {site.name} collects, uses, and protects your information across our IDE and related
            services.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[10px] border border-[#bfc9d6] bg-[var(--color-light-bg)] text-[#131923]">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(19,25,35,0.11)_1px,transparent_1px)] [background-size:26px_26px]" />

        <div className="relative border-b border-[var(--color-light-border)] px-6 py-10 sm:px-8 sm:py-12">
          <div className="max-w-[760px]">
            <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[var(--color-light-muted)]">
              <span className="h-2 w-2 rounded-full bg-[var(--color-light-muted)]" />
              Policy details
            </p>
            <h2 className="mt-4 text-[30px] font-medium leading-[1.05] tracking-[-0.04em] text-[#0f1621] sm:text-[40px] lg:text-[48px]">
              What we collect and how we use it.
            </h2>
          </div>
        </div>

        <div className="relative divide-y divide-[var(--color-light-border)]">
          {sections.map(section => (
            <section key={section.title} className="px-6 py-6 sm:px-8 sm:py-7">
              <h3 className="text-[20px] font-medium leading-[1.2] tracking-[-0.02em] text-[#101a27]">{section.title}</h3>
              <p className="mt-3 max-w-[74ch] text-[14px] leading-[1.6] text-[#273446]/90">{section.body}</p>
            </section>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[10px] border border-[#2d3643] bg-[var(--color-bg-overlay)]">
        <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(to_right,rgba(220,229,240,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(220,229,240,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <p className="text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">
            Questions or privacy requests can be sent to{' '}
            <a className="underline decoration-[var(--color-text-muted)] underline-offset-4 transition hover:text-white" href={`mailto:${site.contactEmail}`}>
              {site.contactEmail}
            </a>
            .
          </p>
          <p className="mt-3 text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">
            For service terms and usage expectations, review our{' '}
            <Link className="underline decoration-[var(--color-text-muted)] underline-offset-4 transition hover:text-white" href="/terms">
              Terms &amp; Conditions
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
