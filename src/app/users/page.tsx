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

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-6">Users</h1>
      <ul className="grid gap-4">
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
    </div>
  );
}
