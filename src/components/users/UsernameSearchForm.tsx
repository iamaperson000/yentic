"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function UsernameSearchForm({
  initialUsername = "",
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
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-2"
    >
      <label className="sr-only" htmlFor="username-search">
        Search by username
      </label>
      <input
        id="username-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search username"
        className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/80 placeholder:text-white/40 shadow-inner shadow-black/10 transition focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
      />
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
      >
        Search
      </button>
    </form>
  );
}
