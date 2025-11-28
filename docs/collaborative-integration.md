# Collaborative editing architecture (client)

This client implementation uses a single Yjs document per room and syncs it over the hosted `y-websocket` endpoint at `wss://y-websocket-server-production-077d.up.railway.app`. Each room name maps directly to a Yjs document name on the server so navigating to another room attaches a fresh provider instance.

## Building blocks
- **Room connection** — `createRoomConnection` spins up a `Y.Doc`, a `WebsocketProvider` pointed at the Railway endpoint, and an Awareness instance for presence. Cleanup tears down bindings, awareness listeners, and the document.
- **Editor binding** — `bindMonacoModel` from `src/lib/collaboration/monacoBinding.ts` uses `y-monaco` to map a Monaco `ITextModel` to a shared `Y.Text`. Local edits are written to the Yjs text and remote updates apply to the Monaco model.
- **Awareness/presence** — `awareness.ts` namespaces local user metadata and cursor position fields. `onAwarenessChange` emits an aggregated, typed list of connected peers so UI components can render avatars or status chips.
- **User identity** — `CollaborationUser` captures name/color/avatar plus optional id for stable hues. Colors are deterministically generated when not provided.
- **Room switching** — `switchRoomConnection` disposes the current provider/doc and creates a new one so the Monaco binding can be reattached to the fresh Yjs text for the next room.

## React integration
`src/components/CollaborativeEditorPage.tsx` demonstrates a full-page experience:
- Reads a `roomName` prop, then sets up a Yjs connection pointing at the fixed websocket endpoint.
- Seeds the shared text with `initialValue` only when the document is empty to avoid overwriting remote state.
- Hooks a Monaco editor to the shared text and pushes cursor selections into the Awareness state; remote cursors are rendered by `y-monaco` decorations.
- Displays presence with names, colors, and cursor offsets and exposes a "Switch room" affordance that tears down the old provider and joins the requested room.

Because the `WebsocketProvider` handles reconnection internally, refreshing or navigating back to a room will resync the current Yjs state from the backend without additional logic.
