import Link from "next/link";

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    where: { username: { not: null } } satisfies Prisma.UserWhereInput,
    orderBy: { createdAt: "desc" } satisfies Prisma.UserOrderByWithRelationInput,
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      bio: true,
    },
  });

  if (users.length === 0) {
    return <p className="text-center text-gray-500 mt-12">No users yet.</p>;
  }

  const orderBy: Prisma.UserOrderByWithRelationInput = { createdAt: "desc" };

  const users = await prisma.user.findMany({
    where,
    orderBy,
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      bio: true,
    },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-gray-500 text-sm">Discover profiles from the community.</p>
        </div>
        <UsersSearchForm initialQuery={trimmedQuery} />
      </div>

      {users.length === 0 ? (
        <p className="text-center text-gray-500 mt-12">
          {trimmedQuery ? "No users matched your search." : "No users yet."}
        </p>
      ) : (
        <ul className="grid gap-4 mt-6">
          {users.map((u) => (
            <li key={u.id} className="p-4 border rounded-lg hover:bg-gray-50 transition">
              <Link href={`/u/${u.username}`} className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={u.image ?? "/default-avatar.png"}
                  alt={u.username ?? "User"}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium">{u.name ?? "Unnamed User"}</p>
                  <p className="text-gray-500 text-sm">@{u.username}</p>
                  {u.bio && <p className="text-gray-500 text-sm">{u.bio}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UsersSearchForm({ initialQuery }: { initialQuery: string }) {
  return (
    <form className="flex w-full max-w-md gap-2" method="get">
      <label className="sr-only" htmlFor="users-search">
        Search users
      </label>
      <input
        id="users-search"
        name="q"
        type="search"
        defaultValue={initialQuery}
        placeholder="Search users"
        className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        Search
      </button>
      {initialQuery ? (
        <Link
          href="/users"
          className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Clear
        </Link>
      ) : null}
    </form>
  );
}
