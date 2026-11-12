"use client";
import { useEffect } from "react";

/**
 * Pictures on the public pages can't be picked up and dragged (to the desktop, a new tab, or the address bar). One listener covers every
 * image, including ones drawn later, in every browser. The signed-in app doesn't mount this (see HideInApp), so dragging there is untouched.
 * Renders nothing.
 */
export default function NoImageDrag() {
  useEffect(() => {
    const stop = (e: DragEvent) => {
      if (e.target instanceof HTMLImageElement || e.target instanceof SVGElement) e.preventDefault();
    };
    document.addEventListener("dragstart", stop);
    return () => document.removeEventListener("dragstart", stop);
  }, []);
  return null;
}
