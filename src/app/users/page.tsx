import Link from 'next/link';
import type { Prisma } from '@prisma/client';

import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function Shell({ children, width = '1200px' }: { children: React.ReactNode; width?: string }) {
  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 sm:py-16" style={{ background: 'var(--y-ink)', color: 'var(--y-fg)' }}>
      <div className="mx-auto flex w-full flex-col gap-10" style={{ maxWidth: width }}>
        {children}
      </div>
    </div>
  );
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const resolvedParams = (await searchParams) ?? {};
  const query = resolvedParams.q?.trim() ?? '';

  if (!process.env.DATABASE_URL) {
    return (
      <Shell width="980px">
        <section
          className="rounded-[12px] border p-8 text-center"
          style={{ borderColor: 'var(--y-brand)', background: 'var(--y-sel-tint)' }}
        >
          <p className="text-lg font-medium" style={{ color: 'var(--y-fg)' }}>Community profiles are unavailable right now.</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--y-muted)' }}>
            Connect a database to browse public user profiles and community search.
          </p>
        </section>
      </Shell>
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
    <Shell>
      <section className="overflow-hidden rounded-[14px] border" style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)' }}>
        <div className="flex flex-col gap-6 px-6 py-10 sm:px-8 sm:py-12 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[64ch]">
            <p className="font-[family-name:var(--font-mono-code)] text-[12.5px]" style={{ color: 'var(--y-brand)' }}># community</p>
            <h1
              className="mt-4 font-[family-name:var(--font-display)] text-[clamp(30px,4.5vw,48px)] font-extrabold leading-[1.03] tracking-[-0.035em]"
              style={{ color: 'var(--y-fg)' }}
            >
              Discover builders across Yentic.
            </h1>
            <p className="mt-4 text-[15px] leading-[1.6]" style={{ color: 'var(--y-muted)' }}>
              Search by name, username, or bio to find collaborators and explore profile pages.
            </p>
          </div>
          <div className="w-full max-w-md">
            <UsersSearchForm initialQuery={query} />
          </div>
        </div>
      </section>

      {users.length === 0 ? (
        <section
          className="rounded-[12px] border px-6 py-10 text-center sm:px-8 sm:py-12"
          style={{ borderColor: 'var(--y-line)', background: 'var(--y-ink)' }}
        >
          <p className="text-lg font-medium" style={{ color: 'var(--y-fg)' }}>
            {query ? <>No users matched &ldquo;{query}&rdquo;.</> : <>No users yet.</>}
          </p>
          <p className="mt-2 text-sm" style={{ color: 'var(--y-muted)' }}>
            {query
              ? 'Try adjusting your search terms or clearing the filter to browse everyone.'
              : 'Check back soon to meet the newest creators joining the platform.'}
          </p>
          {query ? (
            <div className="mt-6 flex justify-center">
              <Link
                href="/users"
                className="inline-flex items-center justify-center rounded-lg border px-5 py-2.5 text-sm font-semibold transition"
                style={{ borderColor: 'var(--y-line)', color: 'var(--y-fg)' }}
              >
                Clear search
              </Link>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="overflow-hidden rounded-[12px] border" style={{ borderColor: 'var(--y-line)', background: 'var(--y-ink)' }}>
          <ul className="grid gap-px sm:grid-cols-2" style={{ background: 'var(--y-line)' }}>
            {users.map((u) => (
              <li key={u.id} style={{ background: 'var(--y-ink)' }}>
                <Link href={`/u/${u.username ?? ''}`} className="flex items-start gap-4 px-6 py-6 sm:px-7 sm:py-7">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={u.image ?? '/default-avatar.svg'}
                    alt={u.username ?? 'User'}
                    className="h-12 w-12 rounded-full border object-cover"
                    style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)' }}
                  />
                  <div className="flex flex-col gap-1">
                    <p className="text-base font-semibold" style={{ color: 'var(--y-fg)' }}>{u.name?.trim() || 'Unnamed User'}</p>
                    <p className="font-[family-name:var(--font-mono-code)] text-sm" style={{ color: 'var(--y-brand)' }}>@{u.username}</p>
                    {u.bio ? (
                      <p className="text-sm" style={{ color: 'var(--y-muted)' }}>{u.bio}</p>
                    ) : (
                      <p className="text-xs" style={{ color: 'var(--y-muted)' }}>No bio yet</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Shell>
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
        className="w-full rounded-lg border px-5 py-2.5 text-sm transition focus:outline-none focus:ring-2"
        style={{ borderColor: 'var(--y-line)', background: 'var(--y-ink)', color: 'var(--y-fg)' }}
      />
      <div className="flex flex-col gap-2 sm:w-auto sm:flex-row">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold transition"
          style={{ background: 'var(--y-brand)', color: 'var(--y-statfg)' }}
        >
          Search
        </button>
        {initialQuery ? (
          <Link
            href="/users"
            className="inline-flex items-center justify-center rounded-lg border px-5 py-2.5 text-sm font-medium transition"
            style={{ borderColor: 'var(--y-line)', color: 'var(--y-fg)' }}
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
