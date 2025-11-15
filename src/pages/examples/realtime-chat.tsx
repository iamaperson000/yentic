import Head from 'next/head';
import { RealtimeChatExample } from '@/components/chat/RealtimeChatExample';

const DEMO_SESSION_ID = 'demo-room-pages';

export default function PagesRealtimeChatDemo() {
  return (
    <>
      <Head>
        <title>Realtime Chat Demo (Pages Router)</title>
      </Head>
      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">Realtime Chat Demo (Pages Router)</h1>
          <p className="text-sm text-slate-600">
            This page demonstrates using the shared Socket.IO hook from a traditional{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5">pages/</code> route.
          </p>
        </div>
        <RealtimeChatExample sessionId={DEMO_SESSION_ID} userId="pages-user" displayName="Pages User" />
      </main>
    </>
  );
}
