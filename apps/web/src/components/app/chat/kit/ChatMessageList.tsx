"use client";
import type { ReactNode, Ref } from "react";

/** The column of messages. Announces new messages politely; `endRef` marks the bottom so the chat can scroll to it. */
export default function ChatMessageList({ children, endRef }: { children: ReactNode; endRef?: Ref<HTMLDivElement> }) {
  return (
    <div className="cx-msgs" aria-live="polite">
      {children}
      <div ref={endRef} />
    </div>
  );
}
