import { NoUserFoundNotice } from "@/components/users/NoUserFoundNotice";
import { UsernameSearchForm } from "@/components/users/UsernameSearchForm";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return [];
}

type UserPageParams = { username?: string };

export default async function UserPage({
  params,
}: {
  params: UserPageParams | Promise<UserPageParams>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const username = resolvedParams?.username;

  if (!username) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-16">
        <div className="text-center text-sm text-white/60">
          Something went wrong while loading this profile.
        </div>
      </div>
    );
  }

  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true, name: true, username: true, bio: true, image: true },
  });

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-16">
        <div className="mx-auto w-full max-w-md">
          <UsernameSearchForm initialUsername={username} />
        </div>
        <NoUserFoundNotice username={username} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-16">
      <div className="mx-auto w-full max-w-md">
        <UsernameSearchForm initialUsername={user.username ?? ""} />
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/10 via-white/5 to-transparent p-10 text-center shadow-2xl shadow-emerald-500/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_55%)]" />
        <div className="relative flex flex-col items-center gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.image ?? "/default-avatar.png"}
            alt={user.username ?? "User"}
            className="h-28 w-28 rounded-full border border-white/20 bg-black/20 object-cover shadow-lg shadow-emerald-500/20"
          />
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-white">@{user.username}</h1>
            {user.name ? (
              <p className="text-lg font-medium text-white/80">{user.name}</p>
            ) : null}
          </div>
          {user.bio ? (
            <p className="max-w-2xl text-sm text-white/70 sm:text-base">
              {user.bio}
            </p>
          ) : (
            <p className="text-sm text-white/40">This creator hasn&apos;t added a bio yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
