import Image from 'next/image';

export default function SponsorBand() {
  return (
    <section className="border-t" style={{ borderColor: 'var(--y-line)' }}>
      <div className="mx-auto flex w-full max-w-[1436px] flex-col items-center gap-5 px-6 py-12 text-center">
        <span
          className="font-[family-name:var(--font-mono-code)] text-[13px] uppercase tracking-[0.28em]"
          style={{ color: 'var(--y-muted)' }}
        >
          proudly sponsored by
        </span>
        <a
          href="https://liveblocks.io"
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-[12px] border px-7 py-4 transition hover:opacity-90"
          style={{ borderColor: 'var(--y-line)', background: '#0b0910' }}
          aria-label="Liveblocks"
        >
          <Image
            src="/liveblocks.png"
            alt="Liveblocks"
            width={260}
            height={57}
            className="rounded-[4px]"
            style={{ height: 52, width: 'auto' }}
          />
        </a>
      </div>
    </section>
  );
}
