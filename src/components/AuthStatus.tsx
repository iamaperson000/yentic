'use client'

import { useSession, signIn, signOut } from 'next-auth/react'

export default function AuthStatus() {
  const { data: session, status } = useSession()

  if (status === 'loading') return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
      Loading…
    </div>
  )

  if (session?.user) {
    return (
      <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-sm">
        <div className="flex items-center gap-2 pl-1 pr-2">
          {session.user.image ? (
            <img src={session.user.image} alt="avatar" className="h-6 w-6 rounded-full" />
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs">
              {(session.user.name || session.user.email || '?').charAt(0).toUpperCase()}
            </span>
          )}
          <span className="hidden sm:inline text-white/80 max-w-[200px] truncate">
            {session.user.email || session.user.name}
          </span>
        </div>
        <button
          onClick={() => signOut()}
          className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/15 hover:text-white"
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn('google')}
      className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-white/10 transition hover:bg-white/90"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,14,24,14c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C34.046,6.053,29.268,4,24,4C15.74,4,8.785,8.735,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36 c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C8.635,39.229,15.731,44,24,44z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.793,2.237-2.231,4.166-4.093,5.571 c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
      </svg>
      <span>Sign in with Google</span>
    </button>
  )
}
