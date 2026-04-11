import { NoUserFoundNotice } from '@/components/users/NoUserFoundNotice';
import { UsernameSearchForm } from '@/components/users/UsernameSearchForm';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  return [];
}

type UserPageParams = { username?: string };

export default async function UserPage({
  params,
}: {
  params: UserPageParams | Promise<UserPageParams>;
}) {
  if (!process.env.DATABASE_URL) {
    return (
      <div className="min-h-screen bg-[#08090a] px-4 py-12 text-white sm:px-6 sm:py-16">
        <div className="mx-auto flex w-full max-w-[980px] flex-col gap-8">
          <div className="rounded-[10px] border border-amber-400/35 bg-amber-500/10 p-8 text-center text-sm text-white/75">
            Public profiles are unavailable until a database is configured.
          </div>
        </div>
      </div>
    );
  }

  const resolvedParams = await Promise.resolve(params);
  const username = resolvedParams?.username;

  if (!username) {
    return (
      <div className="min-h-screen bg-[#08090a] px-4 py-12 text-white sm:px-6 sm:py-16">
        <div className="mx-auto flex w-full max-w-[980px] flex-col gap-8">
          <div className="text-center text-sm text-white/60">Something went wrong while loading this profile.</div>
        </div>
      </div>
    );
  }

  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: 'insensitive' } },
    select: { id: true, name: true, username: true, bio: true, image: true },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-[#08090a] px-4 py-12 text-white sm:px-6 sm:py-16">
        <div className="mx-auto flex w-full max-w-[980px] flex-col gap-8">
          <div className="mx-auto w-full max-w-md">
            <UsernameSearchForm initialUsername={username} />
          </div>
          <NoUserFoundNotice username={username} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090a] px-4 py-12 text-white sm:px-6 sm:py-16">
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-10">
        <div className="mx-auto w-full max-w-md">
          <UsernameSearchForm initialUsername={user.username ?? ''} />
        </div>

        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#07090d]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="relative flex flex-col items-center gap-6 px-6 py-12 text-center sm:px-8 sm:py-14">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user.image ?? '/default-avatar.svg'}
              alt={user.username ?? 'User'}
              className="h-28 w-28 rounded-full border border-[#445162] bg-[#131923] object-cover"
            />
            <div className="space-y-2">
              <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[#9fb0c4]">
                <span className="h-2 w-2 rounded-full bg-[#93a8bf]" />
                Creator profile
              </p>
              <h1 className="text-[34px] font-medium leading-[1.05] tracking-[-0.04em] text-[#edf3fb] sm:text-[48px]">@{user.username}</h1>
              {user.name ? <p className="text-lg font-medium text-[#d3dfee]">{user.name}</p> : null}
            </div>
            {user.bio ? (
              <p className="max-w-[66ch] text-[15px] leading-[1.6] text-[#b8c5d6]">{user.bio}</p>
            ) : (
              <p className="text-sm text-[#8ea0b6]">This creator has not added a bio yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
