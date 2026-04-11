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
        className="w-full rounded-full border border-[#3b4a60] bg-[#0f141d] px-5 py-2.5 text-sm text-[#d3dfee] placeholder:text-[#6f8097] transition focus:border-[#93a8bf] focus:outline-none focus:ring-2 focus:ring-[#93a8bf]/35"
      />
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-200"
      >
        Search
      </button>
    </form>
  );
}
