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
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm gap-2">
      <label className="sr-only" htmlFor="username-search">
        Search by username
      </label>
      <input
        id="username-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search username"
        className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        Search
      </button>
    </form>
  );
}
