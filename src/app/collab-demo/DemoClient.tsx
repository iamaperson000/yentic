'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Monaco from '@monaco-editor/react';
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
  useRoom,
} from '@liveblocks/react/suspense';
import { LiveblocksYjsProvider } from '@liveblocks/yjs';
import * as Y from 'yjs';

import { registerYenticThemes } from '@/components/Editor';

type Tab = {
  key: string;
  label: string;
  monaco: string;
  preview?: boolean;
  starter: string;
};

const TABS: Tab[] = [
  {
    key: 'html',
    label: 'HTML',
    monaco: 'html',
    preview: true,
    starter: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Live together</title>
    <style>
      body { font-family: system-ui, sans-serif; display: grid; place-items: center;
             height: 100vh; margin: 0; background: #201c27; color: #ece7de; }
      h1 { color: #f0a840; }
    </style>
  </head>
  <body>
    <h1>Type here — it's live.</h1>
    <p>Open this page in another window and watch.</p>
  </body>
</html>
`,
  },
  {
    key: 'css',
    label: 'CSS',
    monaco: 'css',
    starter: `.card {
  padding: 24px;
  border-radius: 12px;
  background: #16141a;
  color: #ece7de;
  border: 1px solid #2c2833;
}
.card h2 { color: #f0a840; margin: 0 0 8px; }
`,
  },
  {
    key: 'javascript',
    label: 'JavaScript',
    monaco: 'javascript',
    starter: `// Two people, one file.
const people = ['you', 'them'];

function greet(name) {
  return \`\${name} is editing this right now\`;
}

people.forEach((p) => console.log(greet(p)));
`,
  },
  {
    key: 'python',
    label: 'Python',
    monaco: 'python',
    starter: `# Edits sync as you type.
def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

print([fib(i) for i in range(10)])
`,
  },
  {
    key: 'c',
    label: 'C',
    monaco: 'cpp',
    starter: `#include <stdio.h>

int main(void) {
    printf("Shared cursor, shared file.\\n");
    return 0;
}
`,
  },
  {
    key: 'cpp',
    label: 'C++',
    monaco: 'cpp',
    starter: `#include <iostream>

int main() {
    std::cout << "Type together in real time." << std::endl;
    return 0;
}
`,
  },
  {
    key: 'java',
    label: 'Java',
    monaco: 'java',
    starter: `public class Live {
    public static void main(String[] args) {
        System.out.println("Everyone here shares this buffer.");
    }
}
`,
  },
];

const GUEST_ANIMALS = ['Otter', 'Finch', 'Maple', 'Ember', 'Cedar', 'Wren', 'Sol', 'Juno', 'Pika', 'Koi'];
const GUEST_COLORS = ['#f0a840', '#8ee06f', '#7aa2f7', '#c9a2ff', '#ff8489', '#79c0ff'];

type Guest = { name: string; color: string };
type Peer = { clientId: number; name: string; color: string; self: boolean };

function makeGuest(): Guest {
  const animal = GUEST_ANIMALS[Math.floor(Math.random() * GUEST_ANIMALS.length)];
  const color = GUEST_COLORS[Math.floor(Math.random() * GUEST_COLORS.length)];
  return { name: `${animal}-${Math.random().toString(36).slice(2, 5)}`, color };
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function DemoRoom({ tab, guest }: { tab: Tab; guest: Guest }) {
  const room = useRoom();
  const cleanupRef = useRef<(() => void) | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [code, setCode] = useState(tab.starter);
  const [connected, setConnected] = useState(false);

  const handleMount = useCallback(
    async (editor: import('monaco-editor').editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
      registerYenticThemes(monaco);
      monaco.editor.setTheme('yentic-dusk');

      const model = editor.getModel();
      if (!model) return;

      // y-monaco touches `navigator` at module load — import it client-side only.
      const { MonacoBinding } = await import('y-monaco');

      const ydoc = new Y.Doc();
      const provider = new LiveblocksYjsProvider(room, ydoc);
      const yText = ydoc.getText('code');
      const awareness = provider.awareness as unknown as {
        clientID: number;
        setLocalStateField: (k: string, v: unknown) => void;
        getStates: () => Map<number, { user?: Guest }>;
        on: (e: string, cb: () => void) => void;
        off: (e: string, cb: () => void) => void;
      };
      awareness.setLocalStateField('user', { name: guest.name, color: guest.color });

      const seedIfEmpty = () => {
        if (ydoc.getMap('meta').get('seeded')) return;
        ydoc.transact(() => {
          if (yText.length === 0) yText.insert(0, tab.starter);
          ydoc.getMap('meta').set('seeded', true);
        });
      };
      provider.on('sync', (isSynced: boolean) => {
        setConnected(true);
        if (isSynced) seedIfEmpty();
      });

      const binding = new MonacoBinding(yText, model, new Set([editor]), awareness as never);

      const updatePeers = () => {
        const list: Peer[] = [];
        awareness.getStates().forEach((state, clientId) => {
          const u = state?.user;
          if (u && u.name) {
            list.push({ clientId, name: u.name, color: u.color, self: clientId === awareness.clientID });
          }
        });
        // The local client isn't always present in a fresh room's state map yet —
        // always represent yourself so a solo visitor sees "1 here", not "0".
        if (!list.some((p) => p.self)) {
          list.unshift({ clientId: awareness.clientID, name: guest.name, color: guest.color, self: true });
        }
        setPeers(list);
      };
      awareness.on('change', updatePeers);
      updatePeers();

      const onText = () => setCode(yText.toString());
      yText.observe(onText);
      onText();

      cleanupRef.current = () => {
        awareness.off('change', updatePeers);
        yText.unobserve(onText);
        binding.destroy();
        provider.destroy();
        ydoc.destroy();
      };
    },
    [room, tab, guest],
  );

  useEffect(() => () => cleanupRef.current?.(), []);

  return (
    <div className="cdemo-room">
      <div className="cdemo-body">
        <div className="cdemo-editor">
          <Monaco
            height="100%"
            width="100%"
            theme="yentic-dusk"
            language={tab.monaco}
            path={`demo-${tab.key}`}
            defaultValue=""
            beforeMount={(monaco) => registerYenticThemes(monaco)}
            onMount={handleMount}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              tabSize: 2,
              fontFamily: "var(--font-mono-code), 'JetBrains Mono', ui-monospace, monospace",
              smoothScrolling: true,
              lineHeight: 20,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 12 },
              renderLineHighlight: 'line',
            }}
          />
        </div>
        {tab.preview ? (
          <div className="cdemo-preview">
            <div className="cdemo-preview-bar">live preview · updates as you type</div>
            <iframe title="preview" srcDoc={code} sandbox="allow-scripts" />
          </div>
        ) : (
          <div className="cdemo-hint-pane">
            <div className="cdemo-hint-card">
              <strong>Collaborative editor</strong>
              <p>
                Every keystroke syncs to everyone in the <code>{tab.label}</code> room. Open this page in a
                second window to see it. (Live preview is shown for the HTML tab.)
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="cdemo-statusbar">
        <span className={`cdemo-dot ${connected ? 'on' : ''}`} />
        {connected ? `connected · ${peers.length} here` : 'connecting…'}
        <span className="cdemo-peers">
          {peers.map((p) => (
            <span
              key={p.clientId}
              className="cdemo-av"
              style={{ background: p.color }}
              title={p.self ? `${p.name} (you)` : p.name}
            >
              {initials(p.name)}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

export default function DemoClient() {
  const [active, setActive] = useState<Tab>(TABS[0]);
  const [copied, setCopied] = useState(false);
  // Generate the guest identity on the client only — a random name during SSR
  // would mismatch the client render and break hydration.
  const [guest, setGuest] = useState<Guest | null>(null);
  useEffect(() => {
    queueMicrotask(() => setGuest(makeGuest()));
  }, []);

  const copyLink = useCallback(() => {
    if (typeof window === 'undefined') return;
    void navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  }, []);

  return (
    <div className="cdemo">
      <header className="cdemo-head">
        <div className="cdemo-title">
          <span className="cdemo-sq" />
          <span className="cdemo-brand">yentic</span>
          <span className="cdemo-sub">live collaboration demo</span>
        </div>
        <div className="cdemo-you">
          {guest ? (
            <>
              you’re <span className="cdemo-av" style={{ background: guest.color }}>{initials(guest.name)}</span>
              <b>{guest.name}</b>
            </>
          ) : null}
          <button type="button" className="cdemo-copy" onClick={copyLink}>
            {copied ? 'link copied ✓' : 'copy link to share'}
          </button>
        </div>
      </header>

      <div className="cdemo-howto">
        Open this page in a second window (or send the link) → pick the same tab → type. Edits and cursors
        sync live for everyone in that room. No login.
      </div>

      <nav className="cdemo-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={t.key === active.key ? 'on' : undefined}
            onClick={() => setActive(t)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {guest ? (
        <LiveblocksProvider authEndpoint="/api/liveblocks-demo-auth">
          <RoomProvider key={active.key} id={`demo:${active.key}`} initialPresence={{}}>
            <ClientSideSuspense fallback={<div className="cdemo-loading">connecting to room…</div>}>
              <DemoRoom tab={active} guest={guest} />
            </ClientSideSuspense>
          </RoomProvider>
        </LiveblocksProvider>
      ) : (
        <div className="cdemo-loading">starting…</div>
      )}
    </div>
  );
}
