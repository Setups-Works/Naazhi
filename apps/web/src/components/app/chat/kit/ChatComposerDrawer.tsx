import type { ReactNode } from "react";

/** The space above the text box that holds what is attached to the message (picture and audio previews) and the draft notice. */
export default function ChatComposerDrawer({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2 empty:hidden">{children}</div>;
}
