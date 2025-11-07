import Link from 'next/link';

import { site } from '@/config/site';

const updatedOn = 'April 12, 2024';

const sections = [
  {
    title: '1. Information we collect',
    body:
      'We collect the details you provide when creating an account (such as your name and email), usage data from interactions with the IDE, and diagnostic information that helps us improve performance.',
  },
  {
    title: '2. How we use your data',
    body:
      'Your data powers authentication, workspace sync, and product analytics. We use aggregated usage trends to prioritize features and maintain platform security.',
  },
  {
    title: '3. Sharing your information',
    body:
      'We do not sell your data. We only share it with trusted providers that help us deliver the service (like hosting, authentication, or analytics partners) under strict confidentiality agreements.',
  },
  {
    title: '4. Data retention',
    body:
      'We retain your projects and account data for as long as you maintain an active account. You can request deletion of your data by contacting support.',
  },
  {
    title: '5. Your choices',
    body:
      'You can request access, updates, or deletion of your information at any time. Adjust your notification settings in-app or reach out to us directly for additional preferences.',
  },
  {
    title: '6. Updates to this policy',
    body:
      'We may update this Privacy Policy occasionally. We will notify you about significant changes through email or prominent in-app messages.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">Legal</p>
        <h1 className="text-4xl font-semibold">Privacy Policy</h1>
        <p className="text-sm text-white/60">Last updated {updatedOn}</p>
        <p className="text-base text-white/70">
          This Privacy Policy describes how {site.name} collects, uses, and protects your information when you use our web IDE
          and related services.
        </p>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.title} className="space-y-2">
            <h2 className="text-xl font-semibold text-white">{section.title}</h2>
            <p className="text-sm leading-relaxed text-white/70">{section.body}</p>
          </section>
        ))}
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
        <p>
          If you have questions about this policy or want to exercise your privacy rights, email us at{' '}
          <a className="font-medium text-emerald-300 transition hover:text-emerald-200" href={`mailto:${site.contactEmail}`}>
            {site.contactEmail}
          </a>
          .
        </p>
        <p>
          For more on acceptable use and your responsibilities, read our{' '}
          <Link className="font-medium text-emerald-300 transition hover:text-emerald-200" href="/terms">
            Terms &amp; Conditions
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
