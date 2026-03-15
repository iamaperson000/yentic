'use client';
import { useEffect, useMemo, useRef } from 'react';
import Monaco from '@monaco-editor/react';
import { MonacoBinding } from 'y-monaco';

import { useCollaboration } from '@/components/CollaborativeEditor';

type EditorProps = {
  value: string;
  language: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  path?: string;
};

export function Editor({ value, language, onChange, readOnly = false, path }: EditorProps) {
  const monacoLanguage = language === 'c' ? 'cpp' : language;
  const { awareness, getTextForPath, isActive } = useCollaboration();
  const yText = useMemo(() => (path && isActive ? getTextForPath(path) : null), [getTextForPath, isActive, path]);
  const collaborative = Boolean(yText && awareness);
  const bindingRef = useRef<MonacoBinding | null>(null);

  useEffect(() => {
    return () => {
      bindingRef.current?.destroy?.();
      bindingRef.current = null;
    };
  }, []);

  const handleMount = (editor: import('monaco-editor').editor.IStandaloneCodeEditor) => {
    if (collaborative && yText && awareness) {
      bindingRef.current?.destroy?.();
      const model = editor.getModel();
      if (!model) {
        return;
      }
      bindingRef.current = new MonacoBinding(yText, model, new Set([editor]), awareness);
    } else {
      editor.setValue(value);
    }
  };

  const handleChange = (next?: string) => {
    if (collaborative || readOnly) {
      return;
    }
    const nextValue = next ?? '';
    onChange(nextValue);
  };

  return (
    <div className="relative flex h-full min-h-0">
      <Monaco
        height="100%"
        width="100%"
        theme="vs-dark"
        language={monacoLanguage === 'javascript' ? 'javascript' : monacoLanguage}
        value={collaborative ? undefined : value}
        defaultValue={collaborative && yText ? yText.toString() : value}
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
        onChange={handleChange}
        onMount={handleMount}
      />
    </div>
  );
}
