import { RealtimeChatExample } from '@/components/chat/RealtimeChatExample';

const DEMO_SESSION_ID = 'demo-room';

export default function RealtimeChatDemoPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Realtime Chat Demo</h1>
        <p className="text-sm text-slate-600">
          Ensure <code className="rounded bg-slate-100 px-1 py-0.5">NEXT_PUBLIC_SOCKET_URL</code> points to your Socket.IO server before
          opening multiple tabs of this page to test realtime messaging.
        </p>
      </div>
      <RealtimeChatExample sessionId={DEMO_SESSION_ID} userId="demo-user" displayName="Demo User" />
    </div>
  );
}
