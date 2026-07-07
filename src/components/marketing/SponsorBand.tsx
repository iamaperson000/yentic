import Image from 'next/image';

export default function SponsorBand() {
  return (
    <section className="border-t" style={{ borderColor: 'var(--y-line)' }}>
      <div className="mx-auto flex w-full max-w-[1436px] flex-col items-center gap-6 px-6 py-16 text-center">
        <span
          className="font-[family-name:var(--font-mono-code)] text-[13px] uppercase tracking-[0.32em]"
          style={{ color: 'var(--y-muted)' }}
        >
          proudly sponsored by
        </span>
        <a
          href="https://liveblocks.io"
          target="_blank"
          rel="noreferrer"
          className="inline-flex transition hover:opacity-90"
          aria-label="Liveblocks"
        >
          <Image
            src="/liveblocks.png"
            alt="Liveblocks"
            width={320}
            height={71}
            className="rounded-lg"
            style={{ height: 64, width: 'auto' }}
          />
        </a>
      </div>
    </section>
  );
}
