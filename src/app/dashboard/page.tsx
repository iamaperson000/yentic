import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  if (!session.user?.username) {
    redirect("/setup-profile")
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-16 text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 rounded-3xl border border-white/10 bg-slate-900/70 p-10 shadow-emerald-500/10 backdrop-blur">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">Dashboard</p>
          <h1 className="text-4xl font-semibold">Welcome back, {session.user.name ?? session.user.username}</h1>
          <p className="text-white/60">
            Jump into the IDE or share your public profile with teammates. Project management tools are coming soon.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/ide"
            className="rounded-2xl border border-white/10 bg-slate-950/40 p-6 transition hover:border-emerald-400/80 hover:shadow-lg hover:shadow-emerald-500/20"
          >
            <h2 className="text-xl font-semibold text-white">Open the IDE</h2>
            <p className="mt-2 text-sm text-white/60">
              Launch the in-browser editor to keep building. Your projects stay synced to your profile.
            </p>
          </Link>
          <Link
            href={`/u/${session.user.username}`}
            className="rounded-2xl border border-white/10 bg-slate-950/40 p-6 transition hover:border-emerald-400/80 hover:shadow-lg hover:shadow-emerald-500/20"
          >
            <h2 className="text-xl font-semibold text-white">View your profile</h2>
            <p className="mt-2 text-sm text-white/60">
              Preview your public page and share it with collaborators.
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
