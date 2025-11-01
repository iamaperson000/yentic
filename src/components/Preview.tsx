'use client';
import { SandpackProvider, SandpackLayout, SandpackPreview } from '@codesandbox/sandpack-react';

export function Preview({
  files,
  activePath,
  template,
  disabledMessage
}: {
  files: Record<string, { code: string }>;
  activePath: string;
  template?: 'vanilla';
  disabledMessage?: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/45">
        Live Preview
      </div>
      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_60%)]" />
        {template ? (
          <SandpackProvider
            files={files}
            template={template}
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
        ) : (
          <div className="flex h-full items-center justify-center px-8 text-center text-sm text-white/60">
            {disabledMessage ?? 'Preview is not available for this workspace yet.'}
          </div>
        )}
      </div>
    </div>
  );
}
