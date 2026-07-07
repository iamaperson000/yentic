'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import SignedInHomeShell from '@/components/home/SignedInHomeShell';

export default function ProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/');
    }
  }, [status, router]);

  if (status !== 'authenticated' || !session?.user) {
    return <div className="min-h-[40vh]" aria-hidden />;
  }

  return <SignedInHomeShell />;
}
