'use client';
import Monaco from '@monaco-editor/react';
export function Editor({ value, language, onChange }: { value: string; language: string; onChange: (v: string) => void; }) {
  return (
    <div className="h-full">
      <Monaco height="100%" theme="vs-dark" language={language === 'javascript' ? 'javascript' : language} value={value}
        options={{ minimap: { enabled: false }, fontSize: 14, tabSize: 2, smoothScrolling: true, scrollBeyondLastLine: false }}
        onChange={(val) => onChange(val ?? '')}/>
    </div>
  );
}
