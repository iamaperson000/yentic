import Link from 'next/link';
import type { Prisma } from '@prisma/client';

import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function UsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const resolvedParams = (await searchParams) ?? {};
  const query = resolvedParams.q?.trim() ?? '';

  if (!process.env.DATABASE_URL) {
    return (
      <div className="min-h-screen bg-[#08090a] px-4 py-12 text-white sm:px-6 sm:py-16">
        <div className="mx-auto flex w-full max-w-[980px] flex-col gap-10">
          <section className="rounded-[10px] border border-amber-400/35 bg-amber-500/10 p-8 text-center">
            <p className="text-lg font-medium text-white">Community profiles are unavailable right now.</p>
            <p className="mt-2 text-sm text-white/70">Connect a database to browse public user profiles and community search.</p>
          </section>
        </div>
      </div>
    );
  }

  const where: Prisma.UserWhereInput = {
    username: { not: null },
    ...(query
      ? {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { name: { contains: query, mode: 'insensitive' } },
            { bio: { contains: query, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, username: true, image: true, bio: true },
  });

  return (
    <div className="min-h-screen bg-[#08090a] px-4 py-12 text-white sm:px-6 sm:py-16">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#07090d]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="relative flex flex-col gap-6 px-6 py-10 sm:px-8 sm:py-12 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[64ch]">
              <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[#9fb0c4]">
                <span className="h-2 w-2 rounded-full bg-[#93a8bf]" />
                Community
              </p>
              <h1 className="mt-4 text-[34px] font-medium leading-[1.05] tracking-[-0.04em] text-[#edf3fb] sm:text-[48px]">
                Discover builders across Yentic.
              </h1>
              <p className="mt-4 text-[15px] leading-[1.55] text-[#b8c5d6]">
                Search by name, username, or bio to find collaborators and explore profile pages.
              </p>
            </div>
            <div className="w-full max-w-md">
              <UsersSearchForm initialQuery={query} />
            </div>
          </div>
        </section>

        {users.length === 0 ? (
          <section className="rounded-[10px] border border-[#2d3643] bg-[#171d27] px-6 py-10 text-center sm:px-8 sm:py-12">
            <p className="text-lg font-medium text-[#edf3fb]">
              {query ? <>No users matched &ldquo;{query}&rdquo;.</> : <>No users yet.</>}
            </p>
            <p className="mt-2 text-sm text-[#b8c5d6]">
              {query
                ? 'Try adjusting your search terms or clearing the filter to browse everyone.'
                : 'Check back soon to meet the newest creators joining the platform.'}
            </p>
            {query ? (
              <div className="mt-6 flex justify-center">
                <Link
                  href="/users"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/85 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
                >
                  Clear search
                </Link>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="relative overflow-hidden rounded-[10px] border border-[#bfc9d6] bg-[#dce5f0] text-[#131923]">
            <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(19,25,35,0.11)_1px,transparent_1px)] [background-size:26px_26px]" />
            <ul className="relative grid gap-px bg-[#b5c0ce] sm:grid-cols-2">
              {users.map(u => (
                <li key={u.id} className="group bg-[#dce5f0] transition hover:bg-[#d3dde9]">
                  <Link href={`/u/${u.username ?? ''}`} className="flex items-start gap-4 px-6 py-6 sm:px-7 sm:py-7">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={u.image ?? '/default-avatar.svg'}
                      alt={u.username ?? 'User'}
                      className="h-12 w-12 rounded-full border border-[#b5c0ce] bg-[#e7edf5] object-cover"
                    />
                    <div className="flex flex-col gap-1">
                      <p className="text-base font-semibold text-[#101a27]">{u.name?.trim() || 'Unnamed User'}</p>
                      <p className="text-sm font-medium text-[#33465e]">@{u.username}</p>
                      {u.bio ? (
                        <p className="text-sm text-[#273446]/85">{u.bio}</p>
                      ) : (
                        <p className="text-xs uppercase tracking-[0.2em] text-[#445162]/70">No bio yet</p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
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
        className="w-full rounded-full border border-[#3b4a60] bg-[#0f141d] px-5 py-2.5 text-sm text-[#d3dfee] placeholder:text-[#6f8097] transition focus:border-[#93a8bf] focus:outline-none focus:ring-2 focus:ring-[#93a8bf]/35"
      />
      <div className="flex flex-col gap-2 sm:w-auto sm:flex-row">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-200"
        >
          Search
        </button>
        {initialQuery ? (
          <Link
            href="/users"
            className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/85 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
