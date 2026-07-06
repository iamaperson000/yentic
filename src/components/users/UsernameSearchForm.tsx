'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export function UsernameSearchForm({
  initialUsername = '',
}: {
  initialUsername?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialUsername);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = value.trim();

    if (!trimmed) {
      return;
    }

    router.push(`/u/${encodeURIComponent(trimmed)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
      <label className="sr-only" htmlFor="username-search">
        Search by username
      </label>
      <input
        id="username-search"
        type="search"
        value={value}
        onChange={event => setValue(event.target.value)}
        placeholder="Search username"
        className="w-full rounded-lg border px-5 py-2.5 text-sm transition focus:outline-none focus:ring-2"
        style={{ borderColor: 'var(--y-line)', background: 'var(--y-ink)', color: 'var(--y-fg)' }}
      />
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold transition"
        style={{ background: 'var(--y-brand)', color: 'var(--y-statfg)' }}
      >
        Search
      </button>
    </form>
  );
}
