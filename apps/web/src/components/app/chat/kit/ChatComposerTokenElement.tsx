import type { ReactNode } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

/** A small chip in the composer (a restored draft, a pasted address). With `onRemove` it has a button to dismiss it. */
export default function ChatComposerTokenElement({ children, onRemove, removeLabel }: { children: ReactNode; onRemove?: () => void; removeLabel?: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-pill bg-surface-muted py-1 pr-1 pl-3 text-[12.5px] text-fg-muted">
      <span className="truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          className="grid size-5 shrink-0 place-items-center rounded-pill text-[11px] hover:bg-surface hover:text-fg"
          aria-label={removeLabel ?? "Remove"}
          onClick={onRemove}
        >
          <FA icon={faXmark} />
        </button>
      )}
    </span>
  );
}
