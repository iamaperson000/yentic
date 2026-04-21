"use client";

import { useLiveblocksExtension, FloatingToolbar } from "@liveblocks/react-tiptap";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export function Editor() {
  const liveblocks = useLiveblocksExtension({
    comments: false,
    mentions: false,
  });

  const editor = useEditor({
    extensions: [
      liveblocks,
      StarterKit.configure({
        undoRedo: false,
      }),
    ],
    immediatelyRender: false,
  });

  return (
    <div>
      <EditorContent editor={editor} className="editor" />
      <FloatingToolbar editor={editor} />
    </div>
  );
}
