'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

export default function AuthStatus() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#93a8bf]" aria-hidden="true" />
        <span>Checking session…</span>
      </div>
    );
  }

  if (session?.user) {
    const displayName = session.user.name ?? session.user.email ?? 'Account';
    const initials = getInitials(displayName || '') || 'Y';
    const username = session.user.username ?? session.user.email ?? 'account';
    const profileHref = session.user.username ? `/u/${session.user.username}` : '/setup-profile';

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          className="flex items-center gap-3 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg-surface)] px-4 py-2 text-left text-sm text-[var(--color-text-primary)] transition hover:border-[var(--color-text-muted)] hover:text-white"
        >
          {session.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt={displayName} className="h-9 w-9 rounded-full border border-[var(--color-border-strong)] object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-[#0f141d] text-xs font-semibold text-[var(--color-text-primary)]">
              {initials}
            </div>
          )}
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[var(--color-text-muted)]">Signed in</span>
            <span className="font-semibold text-white">@{username}</span>
          </div>
          <svg className={`h-4 w-4 text-[var(--color-text-muted)] transition ${open ? 'rotate-180 text-white' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="m6 9 6 6 6-6"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
        </button>
        <Dropdown open={open} onClose={() => setOpen(false)}>
          <DropdownItem onSelect={() => router.push('/')}>
            Home
          </DropdownItem>
          <DropdownItem onSelect={() => router.push(profileHref)}>
            {session.user.username ? 'Profile' : 'Finish profile'}
          </DropdownItem>
          <DropdownItem onSelect={() => signOut()} destructive>
            Logout
          </DropdownItem>
        </Dropdown>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn('google', { callbackUrl: '/' })}
      className="group flex items-center gap-4 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-left text-sm text-white/90 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 hover:text-white"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-md">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
          <path
            d="M21.35 11.1h-9.18v2.96h5.48c-.24 1.45-1.46 2.76-3.25 2.76-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6c1.02 0 1.94.43 2.57 1.12l2.06-2.06C17.83 6.69 16.02 5.9 14 5.9c-3.8 0-6.88 3.08-6.88 6.88s3.08 6.88 6.88 6.88c3.94 0 6.55-2.77 6.55-6.55 0-.44-.05-.9-.12-1.31z"
            fill="#4285F4"
          />
          <path
            d="M5.43 13.9a4.11 4.11 0 0 1-.22-1.32c0-.46.08-.9.22-1.32V9.28H2.42a8.09 8.09 0 0 0-.86 3.3c0 1.18.22 2.32.86 3.3l2.15-1.98z"
            fill="#FBBC05"
          />
          <path
            d="M12.17 5.9c1.1 0 2.08.37 2.86 1.1l2.14-2.14C16.62 3.53 15.03 2.9 13.17 2.9c-3.16 0-5.92 1.8-7.24 4.38l2.45 1.87c.6-1.8 2.26-3.25 3.79-3.25z"
            fill="#EA4335"
          />
          <path
            d="M12.17 18.9c1.94 0 3.56-.64 4.75-1.73l-2.15-2.05c-.58.4-1.36.67-2.6.67-1.53 0-3.19-1.44-3.8-3.24l-2.45 1.89c1.322.58 4.08 4.46 7.25 4.46z"
            fill="#34A853"
          />
        </svg>
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-[0.4em] text-white/55">Continue with</span>
        <span className="font-semibold">Google</span>
      </div>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="ml-auto h-4 w-4 text-white/55 transition group-hover:translate-x-1 group-hover:text-white">
        <path
          d="M5 12h14m0 0-5-5m5 5-5 5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </svg>
      <span className="sr-only">Sign in with Google</span>
    </button>
  );
}
