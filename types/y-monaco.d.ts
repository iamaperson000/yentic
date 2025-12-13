declare module 'y-monaco' {
  import * as Y from 'yjs'
  import * as monaco from 'monaco-editor'
  import { Awareness } from 'y-protocols/awareness'

  export class MonacoBinding {
    constructor(
      ytext: Y.Text,
      monacoModel: monaco.editor.ITextModel,
      editors?: Set<monaco.editor.IStandaloneCodeEditor>,
      awareness?: Awareness | null
    )

    readonly doc: Y.Doc
    readonly ytext: Y.Text
    readonly monacoModel: monaco.editor.ITextModel
    readonly editors: Set<monaco.editor.IStandaloneCodeEditor>

    destroy(): void
  }
}
