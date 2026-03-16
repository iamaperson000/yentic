import Link from "next/link";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function UsersPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const query = searchParams?.q?.trim() ?? "";

  if (!process.env.DATABASE_URL) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-16">
        <div className="rounded-3xl border border-amber-400/30 bg-amber-500/10 p-8 text-center">
          <p className="text-lg font-medium text-white">Community profiles are unavailable right now.</p>
          <p className="mt-2 text-sm text-white/70">
            Connect a database to browse public user profiles and community search.
          </p>
        </div>
      </div>
    );
  }

  const where: Prisma.UserWhereInput = {
    username: { not: null },
    ...(query
      ? {
          OR: [
            { username: { contains: query, mode: "insensitive" } },
            { name: { contains: query, mode: "insensitive" } },
            { bio: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, username: true, image: true, bio: true },
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-16">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-8 shadow-2xl shadow-emerald-500/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_55%)]" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
              Community
            </span>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">Discover builders across Yentic</h1>
              <p className="text-sm text-white/70 sm:text-base">
                Search by name, username, or bio to explore the community. Tap a profile to dive into their latest work.
              </p>
            </div>
          </div>
          <div className="w-full max-w-md">
            <UsersSearchForm initialQuery={query} />
          </div>
        </div>
      </section>

      {users.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center shadow-xl shadow-black/20">
          <p className="text-lg font-medium text-white">
            {query ? (
              <>No users matched &ldquo;{query}&rdquo;.</>
            ) : (
              <>No users yet.</>
            )}
          </p>
          <p className="mt-2 text-sm text-white/60">
            {query
              ? "Try adjusting your search terms or clearing the filter to browse everyone."
              : "Check back soon to meet the newest creators joining the platform."}
          </p>
          {query ? (
            <div className="mt-6 flex justify-center">
              <Link
                href="/users"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:bg-white/20 hover:text-white"
              >
                Clear search
              </Link>
            </div>
          ) : null}
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2">
          {users.map((u) => (
            <li
              key={u.id}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20 transition hover:border-emerald-400/30 hover:bg-emerald-500/5"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
              <Link href={`/u/${u.username ?? ""}`} className="relative flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={u.image ?? "/default-avatar.svg"}
                  alt={u.username ?? "User"}
                  className="h-12 w-12 rounded-full border border-white/20 bg-black/20 object-cover shadow-inner shadow-black/40"
                />
                <div className="flex flex-col gap-1">
                  <p className="text-base font-semibold text-white">
                    {u.name?.trim() || "Unnamed User"}
                  </p>
                  <p className="text-sm font-medium text-emerald-300/80">@{u.username}</p>
                  {u.bio ? (
                    <p className="text-sm text-white/60">{u.bio}</p>
                  ) : (
                    <p className="text-xs uppercase tracking-[0.2em] text-white/30">No bio yet</p>
                  )}
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
    <form className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-2" method="get">
      <label className="sr-only" htmlFor="users-search">
        Search users
      </label>
      <input
        id="users-search"
        name="q"
        type="search"
        defaultValue={initialQuery}
        placeholder="Search users"
        className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/80 placeholder:text-white/40 shadow-inner shadow-black/10 transition focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
      />
      <div className="flex flex-col gap-2 sm:w-auto sm:flex-row">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
        >
          Search
        </button>
        {initialQuery ? (
          <Link
            href="/users"
            className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
