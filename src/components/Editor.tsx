'use client';
import Monaco from '@monaco-editor/react';
export function Editor({ value, language, onChange }: { value: string; language: string; onChange: (v: string) => void; }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/45">
        Editor
      </div>
      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(120,119,198,0.18),_transparent_60%)]" />
        <Monaco
          height="100%"
          theme="vs-dark"
          language={language === 'javascript' ? 'javascript' : language}
          value={value}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            tabSize: 2,
            fontFamily: 'var(--font-mono)',
            smoothScrolling: true,
            lineHeight: 22,
            scrollBeyondLastLine: false
          }}
          onChange={val => onChange(val ?? '')}
        />
      </div>
    </div>
  );
}
