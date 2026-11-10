"use client";
import { SplitText } from "gsap/SplitText";
import { useRef, type ReactNode } from "react";
import { fontsReady, showNow, useMotion } from "./motion";

const SIZES = {
  display: "text-[clamp(44px,6.8vw,88px)] leading-[1.02] tracking-[-0.035em]",
  h2: "text-[clamp(32px,4.6vw,58px)] leading-[1.05] tracking-[-0.03em]",
  h3: "text-[clamp(22px,2.4vw,28px)] leading-[1.16] tracking-[-0.022em]",
} as const;

/**
 * The serif heading, with an italic green tail (`quiet`). The words rise out of a mask line by line (GSAP SplitText), as the page loads
 * for the big `display` size and when scrolled into view for the rest. SplitText leaves the text readable to screen readers.
 */
export function Heading({
  children,
  quiet,
  as: Tag = "h2",
  size = "h2",
  dark = false,
  className = "",
  immediate = false,
}: {
  children?: ReactNode;
  quiet?: string;
  as?: "h1" | "h2" | "h3";
  size?: keyof typeof SIZES;
  /** For headings on the ink panels. */
  dark?: boolean;
  className?: string;
  /** Animate at once instead of waiting to scroll into view (the first heading on a page). */
  immediate?: boolean;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useMotion(ref, ({ g, root, calm }) => {
    if (calm) return void showNow(g, root);
    let split: SplitText | undefined;
    let dead = false;
    void fontsReady().then(() => {
      if (dead) return;
      split = new SplitText(root, { type: "lines,words", mask: "lines" });
      g.set(root, { autoAlpha: 1 });
      g.from(split.words, {
        yPercent: 115,
        rotate: 3,
        duration: 1.1,
        ease: "power4.out",
        stagger: 0.045,
        scrollTrigger: immediate ? undefined : { trigger: root, start: "top 88%", once: true },
      });
    });
    return () => {
      dead = true;
      split?.revert();
    };
  });
  return (
    <Tag ref={ref} data-reveal className={`font-serif font-normal text-balance opacity-0 ${SIZES[size]} ${className}`}>
      {children}
      {quiet && (
        <>
          {" "}
          <span className={`italic ${dark ? "text-on-dark/70" : "text-green-fg"}`}>{quiet}</span>
        </>
      )}
    </Tag>
  );
}
