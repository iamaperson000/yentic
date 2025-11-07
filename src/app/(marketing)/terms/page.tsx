import Link from 'next/link';

import { site } from '@/config/site';

const updatedOn = 'April 12, 2024';

const sections = [
  {
    title: '1. Acceptance of terms',
    body:
      'By creating a Yentic account or using the platform, you agree to these Terms & Conditions. If you do not agree, please discontinue use.',
  },
  {
    title: '2. Eligibility & accounts',
    body:
      'You must be at least 13 years old to use Yentic. Keep your login credentials secure and let us know immediately if you suspect unauthorized access.',
  },
  {
    title: '3. Acceptable use',
    body:
      'Use Yentic responsibly. Do not use the service to deploy harmful code, infringe on intellectual property, or violate the rights of others.',
  },
  {
    title: '4. Intellectual property',
    body:
      'You retain ownership of the projects you build. By uploading content, you grant Yentic a limited license to host, process, and display that content for the purpose of providing the service.',
  },
  {
    title: '5. Termination',
    body:
      'We may suspend or terminate your access if you violate these terms. You can close your account anytime by contacting support.',
  },
  {
    title: '6. Changes to these terms',
    body:
      'We may update these Terms & Conditions occasionally. Significant changes will be communicated via email or in-app notifications.',
  },
];

export default function TermsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">Legal</p>
        <h1 className="text-4xl font-semibold">Terms &amp; Conditions</h1>
        <p className="text-sm text-white/60">Last updated {updatedOn}</p>
        <p className="text-base text-white/70">
          These Terms &amp; Conditions explain what you can expect from {site.name} and what we expect from you. They cover the use of
          our web IDE, related services, and all content provided through the platform.
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
          If you have questions about these terms or need help with your account, reach out to us at{' '}
          <a className="font-medium text-emerald-300 transition hover:text-emerald-200" href={`mailto:${site.contactEmail}`}>
            {site.contactEmail}
          </a>
          .
        </p>
        <p>
          You can also review our{' '}
          <Link className="font-medium text-emerald-300 transition hover:text-emerald-200" href="/privacy">
            Privacy Policy
          </Link>{' '}
          to understand how we collect and use your data.
        </p>
      </div>
    </div>
  );
}
