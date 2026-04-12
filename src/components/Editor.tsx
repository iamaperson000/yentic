'use client';
import { useEffect, useRef } from 'react';
import Monaco from '@monaco-editor/react';

import { useCollaboration } from '@/components/CollaborativeEditor';
import { shouldReplaceStandaloneEditorValue } from '@/lib/workspace-collaboration';

type EditorProps = {
  value: string;
  language: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  path?: string;
  onCursorChange?: (line: number, column: number) => void;
};

export function Editor({ value, language, onChange, readOnly = false, path, onCursorChange }: EditorProps) {
  const monacoLanguage = language === 'c' ? 'cpp' : language;
  const { awareness, getTextForPath, isActive } = useCollaboration();
  const yText = path && isActive ? getTextForPath(path) : null;
  const collaborative = Boolean(yText && awareness);
  const bindingRef = useRef<{ destroy?: () => void } | null>(null);
  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null);
  const cursorSubscriptionRef = useRef<{ dispose?: () => void } | null>(null);

  useEffect(() => {
    return () => {
      bindingRef.current?.destroy?.();
      bindingRef.current = null;
      cursorSubscriptionRef.current?.dispose?.();
      cursorSubscriptionRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    let cancelled = false;

    bindingRef.current?.destroy?.();
    bindingRef.current = null;

    if (!editor || !model || !collaborative || !yText || !awareness) {
      return () => {
        cancelled = true;
      };
    }
    const activeEditor = editor;
    const activeModel = model;
    const activeYText = yText;
    const activeAwareness = awareness;

    async function bindEditor() {
      const { MonacoBinding } = await import('y-monaco');
      if (cancelled) {
        return;
      }

      bindingRef.current = new MonacoBinding(activeYText, activeModel, new Set([activeEditor]), activeAwareness);
    }

    void bindEditor();

    return () => {
      cancelled = true;
      bindingRef.current?.destroy?.();
      bindingRef.current = null;
    };
  }, [awareness, collaborative, yText]);

  useEffect(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();

    if (!editor || !model) {
      return;
    }

    if (
      !shouldReplaceStandaloneEditorValue({
        modelValue: model.getValue(),
        nextValue: value,
        collaborative,
      })
    ) {
      return;
    }

    model.setValue(value);
  }, [collaborative, value]);

  const handleMount = (editor: import('monaco-editor').editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    cursorSubscriptionRef.current?.dispose?.();
    const position = editor.getPosition();
    if (position) {
      onCursorChange?.(position.lineNumber, position.column);
    }
    cursorSubscriptionRef.current = editor.onDidChangeCursorPosition(event => {
      onCursorChange?.(event.position.lineNumber, event.position.column);
    });
  };

  const handleChange = (next?: string) => {
    if (collaborative || readOnly) {
      return;
    }
    const nextValue = next ?? '';
    onChange(nextValue);
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1">
      <Monaco
        height="100%"
        width="100%"
        theme="vs-dark"
        language={monacoLanguage === 'javascript' ? 'javascript' : monacoLanguage}
        path={path}
        value={collaborative ? undefined : value}
        defaultValue={collaborative && yText ? yText.toString() : value}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          tabSize: 2,
          fontFamily: 'var(--font-mono)',
          smoothScrolling: true,
          lineHeight: 20,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 10 },
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
