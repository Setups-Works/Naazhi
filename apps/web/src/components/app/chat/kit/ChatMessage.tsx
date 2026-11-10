import type { ReactNode } from "react";

/** One message row: the person's messages sit on the right, the assistant's on the left. `busy` marks a reply still arriving. */
export default function ChatMessage({ role, busy, children }: { role: "user" | "assistant"; busy?: boolean; children: ReactNode }) {
  return (
    <div className="cx-msg" data-role={role} aria-busy={busy || undefined}>
      {children}
    </div>
  );
}
