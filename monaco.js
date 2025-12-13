import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { MonacoBinding } from 'y-monaco'
import * as monaco from 'monaco-editor'
import 'monaco-editor/min/vs/editor/editor.main.css'

const roomName = `monaco-demo-${new Date().toISOString().slice(0, 10)}`

const getButtonLabel = (shouldConnect) => (shouldConnect ? 'Disconnect' : 'Connect')

const initializeEditor = () => {
  const ydoc = new Y.Doc()
  const provider = new WebsocketProvider('wss://demos.yjs.dev/ws', roomName, ydoc)
  const ytext = ydoc.getText('monaco')

  const editor = monaco.editor.create(document.getElementById('monaco-editor'), {
    value: '',
    language: 'javascript',
    theme: 'vs-dark'
  })

  const monacoBinding = new MonacoBinding(
    ytext,
    editor.getModel(),
    new Set([editor]),
    provider.awareness
  )

  const connectBtn = document.getElementById('y-connect-btn')
  connectBtn.textContent = getButtonLabel(provider.shouldConnect)

  connectBtn.addEventListener('click', () => {
    if (provider.shouldConnect) {
      provider.disconnect()
    } else {
      provider.connect()
    }
    connectBtn.textContent = getButtonLabel(provider.shouldConnect)
  })

  window.demoProvider = provider
  window.demoYdoc = ydoc
  window.demoYtext = ytext
  window.demoMonacoBinding = monacoBinding
}

window.addEventListener('load', initializeEditor)
