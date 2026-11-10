"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import ChatLayoutScrollButton from "./ChatLayoutScrollButton";

/** How far from the bottom (px) the reader can be before the "jump to latest" button appears. */
const FAR = 240;

/**
 * The chat page body: a scrolling stage for the messages and the composer's footer beneath it. When the person has scrolled up
 * the stage shows a button that jumps back to the newest message.
 */
export default function ChatLayout({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  const stage = useRef<HTMLDivElement>(null);
  const [away, setAway] = useState(false);

  const check = useCallback(() => {
    const el = stage.current;
    if (el) setAway(el.scrollHeight - el.scrollTop - el.clientHeight > FAR);
  }, []);
  useEffect(check);

  const toEnd = () => {
    const el = stage.current;
    if (!el) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: calm ? "auto" : "smooth" });
  };

  return (
    <>
      <div ref={stage} className="cx-stage" onScroll={check}>
        {children}
        <ChatLayoutScrollButton visible={away} onClick={toEnd} />
      </div>
      <div className="cx-foot">{footer}</div>
    </>
  );
}
