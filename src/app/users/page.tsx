import Image from "next/image"
import Link from "next/link"

import prisma from "@/lib/prisma"

export default async function UsersDirectoryPage() {
  let users: Array<{
    id: string
    name: string | null
    username: string | null
    bio: string | null
    image: string | null
    createdAt: Date
  }> = []

  if (process.env.DATABASE_URL) {
    users = await prisma.user.findMany({
      where: { username: { not: null } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        image: true,
        createdAt: true,
      },
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-16 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="space-y-2 text-center">
          <h1 className="text-4xl font-semibold">Makers building with Yentic</h1>
          <p className="text-white/60">Explore the community of developers shipping projects in the browser.</p>
        </header>
        {users.length === 0 ? (
          <p className="text-center text-white/60">No makers have published profiles yet. Check back soon.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => (
              <article
                key={user.id}
                className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur transition hover:border-emerald-400/60"
              >
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-full border border-white/10 bg-white/5">
                  {user.image ? (
                    <Image src={user.image} alt={user.name ?? user.username ?? "Yentic user"} fill className="object-cover" sizes="48px" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-white/80">
                      {(user.username ?? "?").slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-white">{user.name ?? `@${user.username}`}</p>
                  <p className="text-sm text-white/60">@{user.username}</p>
                </div>
              </div>
              <p className="text-sm text-white/70">
                {user.bio?.length ? user.bio : "No bio yet. Check back soon!"}
              </p>
              <Link
                href={`/u/${user.username}`}
                className="text-sm font-medium text-emerald-300 transition hover:text-emerald-200"
              >
                View profile →
              </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
