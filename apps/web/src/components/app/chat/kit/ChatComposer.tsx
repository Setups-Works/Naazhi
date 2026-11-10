import type { FormEventHandler, ReactNode } from "react";

/** The composer's glass shell: the drawer above, the message box, then the toolbar (attach, AI choice, dictation, send). */
export default function ChatComposer({ onSubmit, children }: { onSubmit: () => void; children: ReactNode }) {
  const submit: FormEventHandler = (e) => {
    e.preventDefault();
    onSubmit();
  };
  return (
    <form className="cx-composer" onSubmit={submit}>
      {children}
    </form>
  );
}

/** The row under the message box. */
export function ChatComposerToolbar({ children }: { children: ReactNode }) {
  return <div className="cx-bar">{children}</div>;
}
