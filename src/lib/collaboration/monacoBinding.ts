import { MonacoBinding } from 'y-monaco';
import type { editor as MonacoEditor, IRange } from 'monaco-editor';
import type { Awareness } from 'y-protocols/awareness';
import type * as Y from 'yjs';

import type { AwarenessCursor } from './types';

export type BindingHandles = {
  binding: MonacoBinding;
  dispose: () => void;
};

export function bindMonacoModel(
  editor: MonacoEditor.IStandaloneCodeEditor,
  model: MonacoEditor.ITextModel,
  yText: Y.Text,
  awareness: Awareness
): BindingHandles {
  const binding = new MonacoBinding(yText, model, new Set([editor]), awareness);
  const dispose = () => binding.destroy();
  return { binding, dispose };
}

export function rangeToCursor(range: IRange | null, model: MonacoEditor.ITextModel | null): AwarenessCursor | null {
  if (!range || !model) return null;
  const anchor = model.getOffsetAt({ lineNumber: range.startLineNumber, column: range.startColumn });
  const head = model.getOffsetAt({ lineNumber: range.endLineNumber, column: range.endColumn });
  if (Number.isNaN(anchor) || Number.isNaN(head)) return null;
  return { anchor, head };
}
