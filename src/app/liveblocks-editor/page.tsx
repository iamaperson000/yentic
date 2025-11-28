'use client';

import { useEffect, useRef } from 'react';

import { initializeCollaborativeEditor } from './app';

export default function LiveblocksEditorPage() {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editorRef.current) return undefined;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    initializeCollaborativeEditor(editorRef.current).then((teardown) => {
      if (disposed) return;
      cleanup = teardown;
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Liveblocks</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Collaborative Monaco editor</h1>
          <p className="text-white/70">
            A minimal example that syncs Monaco editor content over Liveblocks using Yjs and y-monaco.
          </p>
        </header>

        <div
          id="editor"
          ref={editorRef}
          className="h-[640px] w-full overflow-hidden rounded-xl border border-white/10 bg-[#0b1224] shadow-lg shadow-emerald-500/10"
        />
      </div>
    </main>
  );
}
