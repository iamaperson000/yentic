'use client';
import { SandpackProvider, SandpackLayout, SandpackPreview } from '@codesandbox/sandpack-react';

export function Preview({ files, activePath }: { files: Record<string, { code: string }>; activePath: string }) {
  return (
    <div className="h-full">
      <SandpackProvider files={files} template="vanilla" options={{ externalResources: [], activeFile: activePath }}>
        <SandpackLayout style={{ height: '100%', background: 'transparent' }}>
          <SandpackPreview style={{ height: '100%' }} />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
