import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { normalizeUsername } from "@/lib/username";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: { username?: string };
}) {
  const username = normalizeUsername(params?.username);
  if (!username) return { title: "User | Yentic" };

  if (!process.env.DATABASE_URL) {
    return { title: "User | Yentic" };
  }

  // Lookup user profile by normalized username
  const user = (await prisma.user.findFirst({
    where: { username: { equals: username } } as Prisma.UserWhereInput,
  })) as ({ name: string | null; username: string | null } | null);

  const title = user ? `${user.username} | Yentic` : "User | Yentic";
  return { title };
}

export default async function UserPage({
  params,
}: {
  params: { username?: string };
}) {
  const username = normalizeUsername(params?.username);
  if (!username) return notFound();

  if (!process.env.DATABASE_URL) {
    return notFound();
  }

  // Lookup user profile by normalized username
  const user = (await prisma.user.findFirst({
    where: { username: { equals: username } } as Prisma.UserWhereInput,
  })) as
    | ({
        id: string;
        name: string | null;
        username: string | null;
        bio: string | null;
        image: string | null;
      } | null);

  if (!user) return notFound();

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex flex-col items-center text-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={user.image ?? "/default-avatar.png"}
          alt={user.username ?? "User"}
          className="w-24 h-24 rounded-full object-cover"
        />
        <h1 className="text-2xl font-semibold">@{user.username}</h1>
        {user.name && <p className="text-gray-500">{user.name}</p>}
        {user.bio && <p className="mt-1 text-gray-600">{user.bio}</p>}
      </div>
    </div>
  );
}
