import { notFound } from "next/navigation"
import Image from "next/image"

import prisma from "@/lib/prisma"

interface ProfilePageProps {
  params: { username: string }
}

export default async function UserProfilePage({ params }: ProfilePageProps) {
  const profile = await prisma.user.findUnique({
    where: { username: params.username },
    select: {
      name: true,
      username: true,
      image: true,
      bio: true,
      createdAt: true,
    },
  })

  if (!profile) {
    notFound()
  }

  const displayName = profile.name ?? `@${profile.username}`
  const memberSince = new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
  }).format(profile.createdAt)

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-16 text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-3xl border border-white/10 bg-slate-900/70 p-10 shadow-emerald-500/10 backdrop-blur">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border border-white/10 bg-white/10">
            {profile.image ? (
              <Image src={profile.image} alt={displayName} fill className="object-cover" sizes="96px" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-white/80">
                {(profile.username ?? "?").slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="space-y-2">
            <div>
              <h1 className="text-3xl font-semibold">{displayName}</h1>
              <p className="text-sm text-white/60">@{profile.username}</p>
            </div>
            {profile.bio ? <p className="max-w-2xl text-base text-white/70">{profile.bio}</p> : <p className="text-white/40">This maker hasn’t written a bio yet.</p>}
            <p className="text-xs uppercase tracking-[0.35em] text-white/30">Building on Yentic since {memberSince}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
