import GutterSpine from './GutterSpine';

export default function PageHero({
  eyebrow,
  title,
  meta,
  lead,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
  lead?: string;
}) {
  return (
    <section
      className="overflow-hidden rounded-[14px] border"
      style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)' }}
    >
      <div className="grid grid-cols-[40px_1fr] sm:grid-cols-[56px_1fr]">
        <GutterSpine lines={9} />
        <div className="min-w-0 px-6 py-12 sm:px-10 sm:py-14">
          <p className="font-[family-name:var(--font-mono-code)] text-[12.5px]" style={{ color: 'var(--y-brand)' }}>
            # {eyebrow}
          </p>
          <h1
            className="mt-4 font-[family-name:var(--font-display)] text-[clamp(32px,5vw,52px)] font-extrabold leading-[1.02] tracking-[-0.035em]"
            style={{ color: 'var(--y-fg)' }}
          >
            {title}
          </h1>
          {meta ? (
            <p className="mt-3 font-[family-name:var(--font-mono-code)] text-xs" style={{ color: 'var(--y-muted)' }}>
              {meta}
            </p>
          ) : null}
          {lead ? (
            <p className="mt-4 max-w-[68ch] text-[15px] leading-[1.6]" style={{ color: 'var(--y-muted)' }}>
              {lead}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
