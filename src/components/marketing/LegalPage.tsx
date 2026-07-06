import type { ReactNode } from 'react';

import PageHero from './PageHero';

export default function LegalPage({
  title,
  updated,
  lead,
  sectionsHeading,
  sections,
  related,
}: {
  title: string;
  updated: string;
  lead: string;
  sectionsHeading: string;
  sections: { title: string; body: string }[];
  related: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-14">
      <PageHero eyebrow="legal" title={title} meta={`Last updated ${updated}`} lead={lead} />

      <section
        className="overflow-hidden rounded-[12px] border"
        style={{ borderColor: 'var(--y-line)', background: 'var(--y-ink)' }}
      >
        <div className="border-b px-6 py-7 sm:px-8" style={{ borderColor: 'var(--y-line)' }}>
          <h2
            className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.02em]"
            style={{ color: 'var(--y-fg)' }}
          >
            {sectionsHeading}
          </h2>
        </div>
        {sections.map((section) => (
          <div
            key={section.title}
            className="border-b px-6 py-6 last:border-b-0 sm:px-8"
            style={{ borderColor: 'var(--y-line)' }}
          >
            <h3 className="font-[family-name:var(--font-mono-code)] text-[15px] font-semibold" style={{ color: 'var(--y-fg)' }}>
              {section.title}
            </h3>
            <p className="mt-2 max-w-[74ch] text-sm leading-[1.65]" style={{ color: 'var(--y-muted)' }}>
              {section.body}
            </p>
          </div>
        ))}
      </section>

      <section
        className="rounded-[12px] border px-6 py-8 sm:px-8"
        style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)' }}
      >
        {related}
      </section>
    </div>
  );
}
