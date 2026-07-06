import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import SiteShell from '@/components/marketing/SiteShell';
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
    <SiteShell>
      <div className="mx-auto flex w-full max-w-[920px] flex-col gap-10">
        <section className="overflow-hidden rounded-[14px] border" style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)' }}>
          <div className="px-6 py-12 sm:px-8 sm:py-14">
            <p className="font-[family-name:var(--font-mono-code)] text-[12.5px]" style={{ color: 'var(--y-brand)' }}>
              # profile setup
            </p>
            <h1
              className="mt-4 font-[family-name:var(--font-display)] text-[clamp(30px,4.5vw,48px)] font-extrabold leading-[1.03] tracking-[-0.035em]"
              style={{ color: 'var(--y-fg)' }}
            >
              Create your Yentic handle
            </h1>
            <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.6]" style={{ color: 'var(--y-muted)' }}>
              Pick a unique username to finish your profile. You can keep your bio short for now and update it later.
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-[12px] border" style={{ borderColor: 'var(--y-line)', background: 'var(--y-ink)' }}>
          <div className="px-6 py-8 sm:px-8 sm:py-10">
            <SetupProfileForm
              defaultBio={session.user?.bio ?? ''}
              suggestedName={session.user?.name ?? session.user?.email ?? ''}
              nextPath={nextPath}
            />
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
