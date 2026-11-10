import type { ReactNode } from "react";

/**
 * An endless horizontal ticker made with one CSS animation (so it costs nothing on the main thread). `children` is rendered twice so
 * the loop is seamless, and the copy is hidden from assistive tech. It pauses while hovered and stands still with reduced motion.
 */
export function Marquee({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`group overflow-hidden py-1.5 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] ${className}`}>
      <div className="flex w-max animate-marquee gap-3 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        <div className="flex shrink-0 gap-3">{children}</div>
        <div className="flex shrink-0 gap-3" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
