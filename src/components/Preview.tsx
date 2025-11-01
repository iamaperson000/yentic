'use client';

import { SandpackProvider, SandpackLayout, SandpackPreview } from '@codesandbox/sandpack-react';

import type { SupportedLanguage } from '@/lib/project';
import { ExecutablePreview } from './ExecutablePreview';

type PreviewMode = 'sandpack' | 'code' | 'message';

type PreviewProps = {
  files: Record<string, { code: string }>;
  activePath: string;
  template?: 'vanilla';
  mode?: 'sandpack' | 'code';
  disabledMessage?: string;
  activeFileCode?: string;
  activeFileLanguage?: SupportedLanguage;
};

export function Preview({
  files,
  activePath,
  template,
  mode,
  disabledMessage,
  activeFileCode,
  activeFileLanguage
}: PreviewProps) {
  const effectiveMode: PreviewMode = template ? 'sandpack' : mode ?? 'message';
  const label =
    effectiveMode === 'code' && activeFileLanguage
      ? `Live Preview · ${activeFileLanguage.toUpperCase()}`
      : 'Live Preview';

  const isExecutable =
    effectiveMode === 'code' &&
    (activeFileLanguage === 'python' || activeFileLanguage === 'c' || activeFileLanguage === 'java');

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/45">
        {label}
      </div>
      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_60%)]" />
        {effectiveMode === 'sandpack' ? (
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
        ) : effectiveMode === 'code' ? (
          isExecutable ? (
            <ExecutablePreview code={activeFileCode ?? ''} language={activeFileLanguage!} path={activePath} />
          ) : (
            <div className="relative flex h-full flex-col overflow-hidden">
              <div className="relative flex items-center justify-between border-b border-white/10 bg-[#050814]/80 px-4 py-2 text-xs text-white/60">
                <span className="truncate">{activePath.replace(/^[\/]/, '')}</span>
                <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.3em] text-white/50">
                  Viewing
                </span>
              </div>
              <div className="relative flex-1 bg-[#02030c]/85">
                <pre className="h-full w-full overflow-auto whitespace-pre-wrap break-words bg-[#05060f]/60 p-6 font-mono text-sm text-white/80">
                  <code>{activeFileCode ?? ''}</code>
                </pre>
              </div>
            </div>
          )
        ) : (
          <div className="flex h-full items-center justify-center px-8 text-center text-sm text-white/60">
            {disabledMessage ?? 'Preview is not available for this workspace yet.'}
          </div>
        )}
      </div>
    </div>
  );
}
