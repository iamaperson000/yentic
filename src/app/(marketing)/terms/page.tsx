import Link from 'next/link';

import { site } from '@/config/site';

const updatedOn = 'April 12, 2024';

const sections = [
  {
    title: '1. Acceptance of terms',
    body:
      'By creating a Yentic account or using the platform, you agree to these Terms & Conditions. If you do not agree, please discontinue use.'
  },
  {
    title: '2. Eligibility and accounts',
    body:
      'You must be at least 13 years old to use Yentic. Keep login credentials secure and notify us immediately if unauthorized access is suspected.'
  },
  {
    title: '3. Acceptable use',
    body:
      'Use Yentic responsibly. Do not deploy harmful code, infringe intellectual property, violate rights of others, or engage in illegal or malicious activity.'
  },
  {
    title: '4. Intellectual property',
    body:
      'You retain ownership of projects you build. By uploading content, you grant Yentic a limited license to host, process, and display that content to operate the service.'
  },
  {
    title: '5. Termination',
    body:
      'We may suspend or terminate access if these terms are violated. You may close your account any time by contacting support, and you can dispute enforcement actions if needed.'
  },
  {
    title: '6. Changes to these terms',
    body: 'We may revise these Terms & Conditions occasionally and will communicate significant changes through email or in-app notices.'
  }
];

export default function TermsPage() {
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
            Terms &amp; Conditions
          </h1>
          <p className="mt-3 text-[12px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Last updated {updatedOn}</p>
          <p className="mt-4 max-w-[68ch] text-[15px] leading-[1.55] text-[var(--color-text-secondary)]">
            These terms define what you can expect from {site.name} and what we expect from you while using our IDE and related
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
              Agreement terms
            </p>
            <h2 className="mt-4 text-[30px] font-medium leading-[1.05] tracking-[-0.04em] text-[#0f1621] sm:text-[40px] lg:text-[48px]">
              What we expect from each other.
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
            Need help with account terms? Contact{' '}
            <a className="underline decoration-[var(--color-text-muted)] underline-offset-4 transition hover:text-white" href={`mailto:${site.contactEmail}`}>
              {site.contactEmail}
            </a>
            .
          </p>
          <p className="mt-3 text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">
            To understand our data handling practices, read the{' '}
            <Link className="underline decoration-[var(--color-text-muted)] underline-offset-4 transition hover:text-white" href="/privacy">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
