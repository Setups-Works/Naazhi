import type { ReactNode } from "react";

/** A notice from the app rather than from either side of the conversation (no AI selected, an empty chat). */
export default function ChatSystemMessage({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <p className="cx-note" role="status">
      {icon}
      {children}
    </p>
  );
}
