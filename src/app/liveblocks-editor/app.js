import { createClient } from "@liveblocks/client";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import * as monaco from "monaco-editor";
import { MonacoBinding } from "y-monaco";

export function initializeCollaborativeEditor(container) {
  if (!container) {
    return () => {};
  }

  const client = createClient({
    publicApiKey: "pk_prod_TndelJydjHtqVQiVWNxrhxfaAj7J9TuQXNFXRcrC4OnLIHBGGQp427gMbmz7laTF",
  });

  const { room, leave } = client.enterRoom("my-room");
  const yProvider = getYjsProviderForRoom(room);
  const yDoc = yProvider.getYDoc();
  const yText = yDoc.getText("monaco");

  const editor = monaco.editor.create(container, {
    value: "",
    language: "javascript",
  });

  const monacoBinding = new MonacoBinding(
    yText,
    editor.getModel(),
    new Set([editor]),
    yProvider.awareness
  );

  return () => {
    monacoBinding.destroy?.();
    editor.dispose();
    yProvider.destroy?.();
    leave();
    client.destroy?.();
  };
}
