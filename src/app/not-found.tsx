import Link from 'next/link';
import type { JSX } from 'react';

export default function NotFound(): JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#05070B] px-6 py-24 text-white">
      <h1 className="text-4xl font-semibold">Page not found</h1>
      <p className="text-base text-white/70">The page you&apos;re looking for doesn&apos;t exist. Head back to the dashboard.</p>
      <Link
        href="/"
        className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400"
      >
        Return home
      </Link>
    </main>
  );
}
