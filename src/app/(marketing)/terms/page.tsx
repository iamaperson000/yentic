import Link from 'next/link';

import { site } from '@/config/site';
import LegalPage from '@/components/marketing/LegalPage';

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
    <LegalPage
      title="Terms & Conditions"
      updated={updatedOn}
      lead={`These terms define what you can expect from ${site.name} and what we expect from you while using the IDE and related services.`}
      sectionsHeading="What we expect from each other."
      sections={sections}
      related={
        <div className="space-y-3 text-[15px] leading-[1.6]" style={{ color: 'var(--y-muted)' }}>
          <p>
            Need help with account terms? Contact{' '}
            <a className="underline underline-offset-4" style={{ color: 'var(--y-brand)' }} href={`mailto:${site.contactEmail}`}>
              {site.contactEmail}
            </a>
            .
          </p>
          <p>
            To understand our data handling practices, read the{' '}
            <Link className="underline underline-offset-4" style={{ color: 'var(--y-brand)' }} href="/privacy">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      }
    />
  );
}
