import Link from 'next/link';

import { site } from '@/config/site';
import LegalPage from '@/components/marketing/LegalPage';

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
    <LegalPage
      title="Privacy Policy"
      updated={updatedOn}
      lead={`This policy explains how ${site.name} collects, uses, and protects your information across the IDE and related services.`}
      sectionsHeading="What we collect and how we use it."
      sections={sections}
      related={
        <div className="space-y-3 text-[15px] leading-[1.6]" style={{ color: 'var(--y-muted)' }}>
          <p>
            Questions or privacy requests can be sent to{' '}
            <a className="underline underline-offset-4" style={{ color: 'var(--y-brand)' }} href={`mailto:${site.contactEmail}`}>
              {site.contactEmail}
            </a>
            .
          </p>
          <p>
            For service terms and usage expectations, review our{' '}
            <Link className="underline underline-offset-4" style={{ color: 'var(--y-brand)' }} href="/terms">
              Terms &amp; Conditions
            </Link>
            .
          </p>
        </div>
      }
    />
  );
}
