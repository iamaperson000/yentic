import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Code2, UserCircle, Globe, Terminal } from 'lucide-react';

import { authOptions } from '@/lib/auth';

const quickLaunchWorkspaces = [
  { slug: 'web', label: 'Web', icon: Globe },
  { slug: 'python', label: 'Python', icon: Terminal },
  { slug: 'c', label: 'C', icon: Terminal },
  { slug: 'cpp', label: 'C++', icon: Terminal },
  { slug: 'java', label: 'Java', icon: Terminal },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/');
  }

  if (!session.user?.username) {
    redirect('/setup-profile');
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] px-4 py-12 text-white sm:px-6 sm:py-16">
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-10">
        <section className="relative overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="relative px-6 py-12 sm:px-8 sm:py-14">
            <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">
              <span className="h-2 w-2 rounded-full bg-[var(--color-text-muted)]" />
              Dashboard
            </p>
            <h1 className="mt-4 text-[34px] font-medium leading-[1.05] tracking-[-0.04em] text-[var(--color-text-primary)] sm:text-[48px]">
              Welcome back, {session.user.name ?? session.user.username}
            </h1>
            <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.55] text-[var(--color-text-secondary)]">
              Open the IDE or check your public profile.
            </p>
          </div>
        </section>

        <section className="flex flex-wrap items-center gap-2">
          {quickLaunchWorkspaces.map(({ slug, label, icon: Icon }) => (
            <Link
              key={slug}
              href={`/ide/${slug}`}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-white/10 hover:text-white"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </section>

        <section className="relative overflow-hidden rounded-[10px] border border-[#bfc9d6] bg-[var(--color-light-bg)] text-[#131923]">
          <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(19,25,35,0.11)_1px,transparent_1px)] [background-size:26px_26px]" />
          <div className="relative grid gap-px bg-[var(--color-light-border)] sm:grid-cols-2">
            <Link href="/ide" className="group bg-[var(--color-light-bg)] px-6 py-7 transition hover:bg-[var(--color-light-bg-hover)] sm:px-8 sm:py-8">
              <Code2 className="h-6 w-6 text-[var(--color-light-muted)]" />
              <p className="mt-3 text-[12px] uppercase tracking-[0.12em] text-[var(--color-light-muted)]">Workspace</p>
              <h2 className="mt-3 text-[24px] font-medium leading-[1.2] tracking-[-0.02em] text-[#101a27]">Open the IDE</h2>
              <p className="mt-3 text-[14px] leading-[1.6] text-[#273446]/85">
                Open the editor. Your saved projects will be listed here.
              </p>
              <p className="mt-4 text-sm font-semibold text-[#1f2c3d]">Continue to IDE →</p>
            </Link>

            <Link
              href={`/u/${session.user.username}`}
              className="group bg-[var(--color-light-bg)] px-6 py-7 transition hover:bg-[var(--color-light-bg-hover)] sm:px-8 sm:py-8"
            >
              <UserCircle className="h-6 w-6 text-[var(--color-light-muted)]" />
              <p className="mt-3 text-[12px] uppercase tracking-[0.12em] text-[var(--color-light-muted)]">Profile</p>
              <h2 className="mt-3 text-[24px] font-medium leading-[1.2] tracking-[-0.02em] text-[#101a27]">View your profile</h2>
              <p className="mt-3 text-[14px] leading-[1.6] text-[#273446]/85">
                See your public profile page as others see it.
              </p>
              <p className="mt-4 text-sm font-semibold text-[#1f2c3d]">Open profile →</p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
