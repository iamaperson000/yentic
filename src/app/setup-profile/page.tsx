import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import SetupProfileForm from './setup-profile-form';

function getSafeNextPath(value: string | undefined) {
  if (!value || !value.startsWith('/')) {
    return null;
  }

  if (value.startsWith('//') || value.startsWith('/setup-profile')) {
    return null;
  }

  return value;
}

export default async function SetupProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const params = (await searchParams) ?? {};
  const nextPath = getSafeNextPath(params.next);

  if (!session) {
    redirect('/');
  }

  if (session.user?.username) {
    redirect(nextPath ?? '/');
  }

  return (
    <div className="min-h-screen bg-[#08090a] px-4 py-12 text-white sm:px-6 sm:py-16">
      <div className="mx-auto flex w-full max-w-[920px] flex-col gap-10">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#07090d]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="relative px-6 py-12 sm:px-8 sm:py-14">
            <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[#9fb0c4]">
              <span className="h-2 w-2 rounded-full bg-[#93a8bf]" />
              Profile setup
            </p>
            <h1 className="mt-4 text-[34px] font-medium leading-[1.05] tracking-[-0.04em] text-[#edf3fb] sm:text-[48px]">
              Create your Yentic handle
            </h1>
            <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.55] text-[#b8c5d6]">
              Pick a unique username to finish your profile. You can keep your bio short for now and update it later.
            </p>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[10px] border border-[#2d3643] bg-[#171d27]">
          <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(to_right,rgba(220,229,240,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(220,229,240,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="relative px-6 py-8 sm:px-8 sm:py-10">
            <SetupProfileForm
              defaultBio={session.user?.bio ?? ''}
              suggestedName={session.user?.name ?? session.user?.email ?? ''}
              nextPath={nextPath}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
