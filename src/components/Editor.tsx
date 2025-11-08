'use client';
import Monaco from '@monaco-editor/react';

type EditorProps = {
  value: string;
  language: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
};

export function Editor({ value, language, onChange, readOnly = false }: EditorProps) {
  const monacoLanguage = language === 'c' ? 'cpp' : language;
  return (
    <div className="relative flex h-full min-h-0">
      <Monaco
        height="100%"
        width="100%"
        theme="vs-dark"
        language={monacoLanguage === 'javascript' ? 'javascript' : monacoLanguage}
        value={value}
        options={{
          minimap: { enabled: false },
          fontSize: 15,
          tabSize: 2,
          fontFamily: 'var(--font-mono)',
          smoothScrolling: true,
          lineHeight: 22,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 12 },
          glyphMargin: false,
          lineDecorationsWidth: 8,
          overviewRulerBorder: false,
          renderLineHighlight: 'line',
          wordWrap: 'off',
          readOnly,
          domReadOnly: readOnly,
        }}
        onChange={val => {
          if (readOnly) {
            return;
          }
          onChange(val ?? '');
        }}
      />
    </div>
  );
}
