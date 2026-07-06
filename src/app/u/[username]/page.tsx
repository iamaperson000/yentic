import { NoUserFoundNotice } from '@/components/users/NoUserFoundNotice';
import { UsernameSearchForm } from '@/components/users/UsernameSearchForm';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  return [];
}

type UserPageParams = { username?: string };

function Shell({ children, width = '980px' }: { children: React.ReactNode; width?: string }) {
  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 sm:py-16" style={{ background: 'var(--y-ink)', color: 'var(--y-fg)' }}>
      <div className="mx-auto flex w-full flex-col gap-8" style={{ maxWidth: width }}>
        {children}
      </div>
    </div>
  );
}

export default async function UserPage({
  params,
}: {
  params: UserPageParams | Promise<UserPageParams>;
}) {
  if (!process.env.DATABASE_URL) {
    return (
      <Shell>
        <div
          className="rounded-[12px] border p-8 text-center text-sm"
          style={{ borderColor: 'var(--y-brand)', background: 'var(--y-sel-tint)', color: 'var(--y-fg)' }}
        >
          Public profiles are unavailable until a database is configured.
        </div>
      </Shell>
    );
  }

  const resolvedParams = await Promise.resolve(params);
  const username = resolvedParams?.username;

  if (!username) {
    return (
      <Shell>
        <div className="text-center text-sm" style={{ color: 'var(--y-muted)' }}>
          Something went wrong while loading this profile.
        </div>
      </Shell>
    );
  }

  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: 'insensitive' } },
    select: { id: true, name: true, username: true, bio: true, image: true },
  });

  if (!user) {
    return (
      <Shell>
        <div className="mx-auto w-full max-w-md">
          <UsernameSearchForm initialUsername={username} />
        </div>
        <NoUserFoundNotice username={username} />
      </Shell>
    );
  }

  return (
    <Shell width="1080px">
      <div className="mx-auto w-full max-w-md">
        <UsernameSearchForm initialUsername={user.username ?? ''} />
      </div>

      <section className="overflow-hidden rounded-[14px] border" style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)' }}>
        <div className="flex flex-col items-center gap-6 px-6 py-12 text-center sm:px-8 sm:py-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.image ?? '/default-avatar.svg'}
            alt={user.username ?? 'User'}
            className="h-28 w-28 rounded-full border object-cover"
            style={{ borderColor: 'var(--y-line)', background: 'var(--y-ink)' }}
          />
          <div className="space-y-2">
            <p className="font-[family-name:var(--font-mono-code)] text-[12.5px]" style={{ color: 'var(--y-brand)' }}>
              # creator profile
            </p>
            <h1
              className="font-[family-name:var(--font-display)] text-[clamp(30px,4.5vw,48px)] font-extrabold leading-[1.03] tracking-[-0.035em]"
              style={{ color: 'var(--y-fg)' }}
            >
              @{user.username}
            </h1>
            {user.name ? <p className="text-lg font-medium" style={{ color: 'var(--y-fg)' }}>{user.name}</p> : null}
          </div>
          {user.bio ? (
            <p className="max-w-[66ch] text-[15px] leading-[1.6]" style={{ color: 'var(--y-muted)' }}>{user.bio}</p>
          ) : (
            <p className="text-sm" style={{ color: 'var(--y-muted)' }}>This creator has not added a bio yet.</p>
          )}
        </div>
      </section>
    </Shell>
  );
}
