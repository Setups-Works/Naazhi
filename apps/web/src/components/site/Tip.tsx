import type { ReactNode } from "react";

/**
 * A hover and keyboard-focus tooltip made with CSS only: a small ink bubble above whatever it wraps. It appears when the wrapper (or
 * anything inside it) is hovered or focused, so it works for links and buttons without any script. Keep the text to a sentence.
 */
export function Tip({ content, children, className = "inline-flex" }: { content: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={`group/tip relative ${className}`}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 w-max max-w-[260px] -translate-x-1/2 translate-y-1 rounded-r2 bg-fill-dark px-3 py-2 text-center text-[12.5px] leading-snug text-on-dark opacity-0 transition-[opacity,transform] duration-200 group-focus-within/tip:translate-y-0 group-focus-within/tip:opacity-100 group-hover/tip:translate-y-0 group-hover/tip:opacity-100 motion-reduce:transition-none"
      >
        {content}
      </span>
    </span>
  );
}
