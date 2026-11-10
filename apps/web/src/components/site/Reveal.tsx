"use client";
import { useRef, type ReactNode } from "react";
import { showNow, useMotion } from "./motion";

/**
 * Fades and rises into place the first time it scrolls into view. With `stagger` (seconds), the children marked with `<R>` come in
 * one after another instead. The content is hidden until then (`opacity-0`); the layout's <noscript> rule and the reduced-motion
 * mode both show it straight away.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  stagger,
}: {
  children: ReactNode;
  className?: string;
  /** Milliseconds before it appears, once in view. */
  delay?: number;
  stagger?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref, ({ g, root, calm }) => {
    const targets = stagger ? root.querySelectorAll("[data-r]") : root;
    if (calm) return void showNow(g, targets);
    g.fromTo(
      targets,
      { y: 32, autoAlpha: 0 },
      {
        y: 0,
        autoAlpha: 1,
        duration: 1,
        delay: delay / 1000,
        ease: "power3.out",
        stagger: stagger ?? 0,
        scrollTrigger: { trigger: root, start: "top 90%", once: true },
      },
    );
  });
  // With `stagger` the wrapper stays visible and its `<R>` children carry the hidden state.
  return (
    <div ref={ref} data-reveal={stagger ? undefined : ""} className={`${stagger ? "" : "opacity-0"} ${className}`}>
      {children}
    </div>
  );
}

/** A child of `<Reveal stagger>`. */
export function R({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" | "article" }) {
  return (
    <Tag data-r data-reveal className={`opacity-0 ${className}`}>
      {children}
    </Tag>
  );
}
