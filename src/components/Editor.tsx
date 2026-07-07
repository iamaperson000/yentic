'use client';
import { useEffect, useRef } from 'react';
import Monaco from '@monaco-editor/react';

import { useCollaboration } from '@/components/CollaborativeEditor';
import { shouldReplaceStandaloneEditorValue } from '@/lib/workspace-collaboration';

type MonacoNamespace = typeof import('monaco-editor');

// Token + chrome colors lifted from the IDE mockup so the editor matches the
// surrounding Dusk / Daylight skin instead of stock vs-dark / vs.
const DUSK_RULES = [
  { token: '', foreground: 'ece7de' },
  { token: 'comment', foreground: '6b6576', fontStyle: 'italic' },
  { token: 'keyword', foreground: 'ff8489' },
  { token: 'keyword.json', foreground: 'ff8489' },
  { token: 'operator', foreground: 'c9a2ff' },
  { token: 'delimiter', foreground: 'c3bdaf' },
  { token: 'delimiter.html', foreground: '8a8478' },
  { token: 'delimiter.xml', foreground: '8a8478' },
  { token: 'string', foreground: '8ee06f' },
  { token: 'string.escape', foreground: '8ee06f' },
  { token: 'string.key.json', foreground: '7aa2f7' },
  { token: 'string.value.json', foreground: '8ee06f' },
  { token: 'number', foreground: '79c0ff' },
  { token: 'regexp', foreground: '8ee06f' },
  { token: 'type', foreground: '7aa2f7' },
  { token: 'type.identifier', foreground: '7aa2f7' },
  { token: 'tag', foreground: '7aa2f7' },
  { token: 'metatag', foreground: '7aa2f7' },
  { token: 'attribute.name', foreground: 'f0a840' },
  { token: 'attribute.value', foreground: '8ee06f' },
  { token: 'variable', foreground: 'ece7de' },
  { token: 'variable.predefined', foreground: 'c9a2ff' },
  { token: 'function', foreground: 'f0a840' },
  { token: 'identifier', foreground: 'ece7de' },
] as const;

const DAY_RULES = [
  { token: '', foreground: '231f1a' },
  { token: 'comment', foreground: '9a9483', fontStyle: 'italic' },
  { token: 'keyword', foreground: 'c0355a' },
  { token: 'operator', foreground: '8043c9' },
  { token: 'delimiter', foreground: '3a352c' },
  { token: 'delimiter.html', foreground: '7c7565' },
  { token: 'string', foreground: '2f8a45' },
  { token: 'string.key.json', foreground: '2d5bd6' },
  { token: 'string.value.json', foreground: '2f8a45' },
  { token: 'number', foreground: '2d5bd6' },
  { token: 'regexp', foreground: '2f8a45' },
  { token: 'type', foreground: '2d5bd6' },
  { token: 'type.identifier', foreground: '2d5bd6' },
  { token: 'tag', foreground: '2d5bd6' },
  { token: 'metatag', foreground: '2d5bd6' },
  { token: 'attribute.name', foreground: 'b06a00' },
  { token: 'attribute.value', foreground: '2f8a45' },
  { token: 'function', foreground: 'b06a00' },
] as const;

let themesRegistered = false;
export function registerYenticThemes(monaco: MonacoNamespace) {
  if (themesRegistered) return;
  themesRegistered = true;
  monaco.editor.defineTheme('yentic-dusk', {
    base: 'vs-dark',
    inherit: true,
    rules: DUSK_RULES.map(r => ({ ...r })),
    colors: {
      'editor.background': '#201c27',
      'editor.foreground': '#ece7de',
      'editorLineNumber.foreground': '#5f5a68',
      'editorLineNumber.activeForeground': '#8a8478',
      'editor.selectionBackground': '#39333f',
      'editor.lineHighlightBackground': '#26212e',
      'editor.lineHighlightBorder': '#00000000',
      'editorCursor.foreground': '#f0a840',
      'editorIndentGuide.background1': '#2c2833',
      'editorIndentGuide.activeBackground1': '#39333f',
      'editorWhitespace.foreground': '#2c2833',
      'editorGutter.background': '#201c27',
      'editorBracketMatch.background': '#2c2833',
      'editorBracketMatch.border': '#39333f',
      'scrollbarSlider.background': '#39333f66',
      'scrollbarSlider.hoverBackground': '#39333faa',
    },
  });
  monaco.editor.defineTheme('yentic-day', {
    base: 'vs',
    inherit: true,
    rules: DAY_RULES.map(r => ({ ...r })),
    colors: {
      'editor.background': '#faf8f1',
      'editor.foreground': '#231f1a',
      'editorLineNumber.foreground': '#a89f8c',
      'editorLineNumber.activeForeground': '#7c7565',
      'editor.lineHighlightBackground': '#efece1',
      'editor.lineHighlightBorder': '#00000000',
      'editorCursor.foreground': '#c17615',
      'editorGutter.background': '#faf8f1',
    },
  });
}

function currentYenticTheme(): 'yentic-dusk' | 'yentic-day' {
  if (typeof document === 'undefined') return 'yentic-dusk';
  const skin = document.querySelector('.yide');
  return skin?.getAttribute('data-theme') === 'daylight' ? 'yentic-day' : 'yentic-dusk';
}

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
  const monacoRef = useRef<MonacoNamespace | null>(null);

  // Follow the topbar Dusk/Daylight toggle, which flips `.yide[data-theme]`.
  useEffect(() => {
    const skin = document.querySelector('.yide');
    if (!skin) return;
    const observer = new MutationObserver(() => {
      monacoRef.current?.editor.setTheme(currentYenticTheme());
    });
    observer.observe(skin, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

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
        theme="yentic-dusk"
        beforeMount={(monaco) => {
          monacoRef.current = monaco;
          registerYenticThemes(monaco);
          monaco.editor.setTheme(currentYenticTheme());
        }}
        language={monacoLanguage === 'javascript' ? 'javascript' : monacoLanguage}
        path={path}
        value={collaborative ? undefined : value}
        defaultValue={collaborative && yText ? yText.toString() : value}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          tabSize: 2,
          fontFamily: "var(--font-mono-code), 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
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
