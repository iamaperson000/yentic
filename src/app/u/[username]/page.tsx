import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { username: string };

const getUserByUsername = cache(async (username: string) => {
  return prisma.user.findFirst({
    where: {
      username: {
        equals: username,
        mode: "insensitive",
      },
    },
    select: { name: true, username: true, bio: true, image: true },
  });
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const user = await getUserByUsername(params.username);
  const title = user ? `${user.username} | Yentic` : "User | Yentic";
  return { title };
}

export default async function UserPage({ params }: { params: Params }) {
  const user = await getUserByUsername(params.username);
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
