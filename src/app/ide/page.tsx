'use client';

import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
  SandpackConsole
} from '@codesandbox/sandpack-react';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';

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

  const [activeSandpackView, setActiveSandpackView] = useState<'preview' | 'console'>('preview');

  useEffect(() => {
    // Force iframe and all parent containers to fill space
    const fixSandpackHeight = () => {
      // Fix preview container
      const containers = document.querySelectorAll('.sp-preview-container');
      containers.forEach((container) => {
        (container as HTMLElement).style.height = '100%';
        (container as HTMLElement).style.minHeight = '0';
        (container as HTMLElement).style.flex = '1';
        (container as HTMLElement).style.display = 'flex';
        (container as HTMLElement).style.flexDirection = 'column';
      });

      // Fix iframe
      const iframes = document.querySelectorAll('.sp-preview-iframe');
      iframes.forEach((iframe) => {
        (iframe as HTMLElement).style.height = '100% !important';
        (iframe as HTMLElement).style.minHeight = '100% !important';
        (iframe as HTMLElement).style.width = '100%';
        (iframe as HTMLElement).style.flex = '1';
      });

      // Fix preview wrapper
      const previews = document.querySelectorAll('.sp-preview');
      previews.forEach((preview) => {
        (preview as HTMLElement).style.height = '100%';
        (preview as HTMLElement).style.minHeight = '0';
        (preview as HTMLElement).style.flex = '1';
        (preview as HTMLElement).style.display = 'flex';
        (preview as HTMLElement).style.flexDirection = 'column';
      });
    };

    fixSandpackHeight();
    const interval = setInterval(fixSandpackHeight, 50);

    return () => clearInterval(interval);
  }, [activeSandpackView]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/45">{label}</span>
        {effectiveMode === 'sandpack' ? (
          <div className="flex items-center gap-1.5 text-white/60">
            <button
              type="button"
              onClick={() => setActiveSandpackView('preview')}
              className={clsx(
                'relative rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] transition',
                activeSandpackView === 'preview'
                  ? 'bg-emerald-400/90 text-slate-950 shadow-[0_10px_30px_rgba(16,185,129,0.4)]'
                  : 'border border-white/10 bg-transparent text-white/60 hover:border-white/25 hover:text-white/80'
              )}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => setActiveSandpackView('console')}
              className={clsx(
                'relative rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] transition',
                activeSandpackView === 'console'
                  ? 'bg-emerald-400/90 text-slate-950 shadow-[0_10px_30px_rgba(16,185,129,0.4)]'
                  : 'border border-white/10 bg-transparent text-white/60 hover:border-white/25 hover:text-white/80'
              )}
            >
              Console
            </button>
          </div>
        ) : null}
      </div>
      <div className="relative flex flex-1 min-h-0">
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
              showConsole: true,
              showOpenInCodeSandbox: false
            }}
          >
            <div className="relative z-10 flex h-full min-h-0 flex-1 flex-col" style={{ height: '100%', minHeight: 0 }}>
              <SandpackLayout
                className="!h-full !min-h-0 !w-full !border-none !bg-transparent !shadow-none"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gridTemplateRows: '1fr',
                  padding: 0,
                  gap: 0,
                  height: '100%',
                  minHeight: 0,
                  width: '100%',
                  flex: 1
                }}
              >
                <div className="flex h-full min-h-0 w-full flex-1 flex-col" style={{ height: '100%', minHeight: 0 }}>
                  <SandpackPreview
                    showOpenInCodeSandbox={false}
                    className={clsx(
                      '!flex !h-full !min-h-0 !w-full !flex-1 !flex-col !bg-transparent',
                      activeSandpackView !== 'preview' && 'hidden'
                    )}
                    style={{
                      height: '100%',
                      minHeight: 0,
                      width: '100%',
                      flex: 1,
                      display: activeSandpackView === 'preview' ? 'flex' : 'none',
                      flexDirection: 'column',
                      background: 'transparent',
                      border: 'none',
                      boxShadow: 'none'
                    }}
                  />
                  <SandpackConsole
                    showHeader={false}
                    className={clsx(
                      '!flex !h-full !min-h-0 !w-full !flex-1 !flex-col !bg-[#05060f]/70 !text-[13px]',
                      activeSandpackView !== 'console' && 'hidden'
                    )}
                    style={{
                      height: '100%',
                      minHeight: 0,
                      width: '100%',
                      flex: 1,
                      display: activeSandpackView === 'console' ? 'flex' : 'none',
                      flexDirection: 'column',
                      background: 'rgba(5, 6, 15, 0.7)',
                      border: 'none',
                      boxShadow: 'none'
                    }}
                  />
                </div>
                <SandpackCodeEditor
                  className="hidden"
                  style={{
                    display: 'none'
                  }}
                />
                <SandpackCodeEditor
                  className="hidden"
                  style={{
                    display: 'none'
                  }}
                />
              </SandpackLayout>
            </div>
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
