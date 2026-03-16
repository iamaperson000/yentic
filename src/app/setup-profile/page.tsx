import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import SetupProfileForm from "./setup-profile-form"

function getSafeNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/")) {
    return null
  }

  if (value.startsWith("//") || value.startsWith("/setup-profile")) {
    return null
  }

  return value
}

export default async function SetupProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>
}) {
  const session = await getServerSession(authOptions)
  const params = (await searchParams) ?? {}
  const nextPath = getSafeNextPath(params.next)

  if (!session) {
    redirect("/")
  }

  if (session.user?.username) {
    redirect(nextPath ?? "/dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-16 text-white">
      <div className="w-full max-w-xl space-y-8 rounded-2xl border border-white/10 bg-slate-900/70 p-8 shadow-xl shadow-emerald-500/10 backdrop-blur">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold">Create your Yentic handle</h1>
          <p className="text-sm text-white/60">
            Pick a unique username to finish setting up your profile. You can add a short bio now or come back to it later. 
          </p>
        </header>
        <SetupProfileForm
          defaultBio={session.user?.bio ?? ""}
          suggestedName={session.user?.name ?? session.user?.email ?? ""}
          nextPath={nextPath}
        />
      </div>
    </div>
  )
}
