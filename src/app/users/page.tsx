import Image from "next/image"
import Link from "next/link"

import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    where: { username: { not: null } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      bio: true,
    },
  })

  return (
    <div className="mx-auto mt-12 w-full max-w-3xl px-4">
      <h1 className="text-2xl font-semibold">Users</h1>
      {users.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No users yet.</p>
      ) : (
        <ul className="mt-6 grid gap-4">
          {users.map((user) => (
            <li
              key={user.id}
              className="rounded-lg border border-border bg-card p-4 shadow-sm transition hover:border-primary/50 hover:bg-card/80"
            >
              <Link href={`/u/${user.username}`} className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-muted">
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.username ?? "User"}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold uppercase text-muted-foreground">
                      {(user.username ?? "?").slice(0, 2)}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium">{user.name ?? "Unnamed User"}</p>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
              </Link>
              {user.bio ? <p className="mt-2 text-sm text-muted-foreground">{user.bio}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
