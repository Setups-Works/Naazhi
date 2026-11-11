"use client";
import { Icon as FA } from "@/components/ui/Icon";
import { faArrowDown } from "@fortawesome/free-solid-svg-icons";

/** Floats at the bottom of the message stage once the reader has scrolled up; jumps back to the newest message. */
export default function ChatLayoutScrollButton({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  if (!visible) return null;
  return (
    <div className="pointer-events-none sticky bottom-0 h-0 self-center">
      <button
        type="button"
        className="glass glass-hover pointer-events-auto absolute bottom-3 left-1/2 grid size-10 -translate-x-1/2 place-items-center rounded-pill text-[13px] text-fg-muted shadow-e2 transition-transform duration-200 ease-(--spring) hover:text-fg active:scale-95 motion-reduce:transition-none"
        aria-label="Jump to the latest message"
        onClick={onClick}
      >
        <FA icon={faArrowDown} />
      </button>
    </div>
  );
}
