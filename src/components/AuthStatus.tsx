'use client'

import { useSession, signIn, signOut } from 'next-auth/react'

export default function AuthStatus() {
  const { data: session, status } = useSession()

  if (status === 'loading') return <p>Loading...</p>

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        <span>Signed in as {session.user.email}</span>
        <button onClick={() => signOut()} className="px-2 py-1 bg-white/10 rounded">Sign out</button>
      </div>
    )
  }

  return (
    <button onClick={() => signIn('google')} className="px-2 py-1 bg-white/10 rounded">
      Sign in with Google
    </button>
  )
}
