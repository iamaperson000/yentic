'use client';
import { SandpackProvider, SandpackLayout, SandpackPreview } from '@codesandbox/sandpack-react';

export function Preview({ files, activePath }: { files: Record<string, { code: string }>; activePath: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/45">
        Live Preview
      </div>
      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_60%)]" />
        <SandpackProvider
          files={files}
          template="vanilla"
          options={{
            externalResources: [],
            activeFile: activePath,
            showTabs: false,
            showNavigator: false,
            showConsole: false
          }}
        >
          <SandpackLayout style={{ height: '100%', background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <SandpackPreview style={{ height: '100%', background: 'transparent', border: 'none', boxShadow: 'none' }} />
          </SandpackLayout>
        </SandpackProvider>
      </div>
    </div>
  );
}
