import "@liveblocks/react-ui/styles.css";
import "@liveblocks/react-tiptap/styles.css";
import "./editor.css";

import type { ReactNode } from "react";

export default function CollabLayout({ children }: { children: ReactNode }) {
  return <div className="collab-page">{children}</div>;
}
