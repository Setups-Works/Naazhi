import type { ReactNode } from "react";

/** The glass bubble (dark for the person's own messages, set by the row's role) that holds a message's text, cards and files. */
export default function ChatMessageBubble({ children }: { children: ReactNode }) {
  return <div className="cx-bubble">{children}</div>;
}
