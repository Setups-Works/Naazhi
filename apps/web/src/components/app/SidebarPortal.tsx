"use client";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Where AppNav shows a page's own list (chats, feeds, days) inside the main sidebar, under the section links. */
export const SIDEBAR_SLOT_ID = "sb-page-slot";

/**
 * Draws its children inside the main sidebar instead of in the page. The page keeps its data and handlers; only where they are
 * drawn moves (the way To-do's views live in the sidebar). Renders nothing until the sidebar's slot exists.
 */
export default function SidebarPortal({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setSlot(document.getElementById(SIDEBAR_SLOT_ID));
  }, []);
  return slot ? createPortal(children, slot) : null;
}
