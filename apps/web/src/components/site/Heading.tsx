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
  heart = false,
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
  /** Put the pink heart right after the `quiet` words (it stays on their line). */
  heart?: boolean;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useMotion(ref, ({ g, root, calm }) => {
    if (calm) return void showNow(g, root);
    let split: SplitText | undefined;
    let dead = false;
    void fontsReady().then(() => {
      if (dead) return;
      split = new SplitText(root, { type: "lines,words", mask: "lines" });
      // Each line sits in a clipping mask for the rise-in. Italic letters lean past the end of their line (the "p" of "keep") and
      // descenders hang below it, so give every mask room on those sides and take it back with a negative margin: nothing moves, nothing is cut.
      for (const mask of split.masks) {
        const m = (mask as HTMLElement).style;
        m.paddingInline = "0.14em";
        m.marginInline = "-0.14em";
        m.paddingBlock = "0.12em";
        m.marginBlock = "-0.12em";
      }
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
    <Tag ref={ref} data-reveal className={`font-serif font-semibold text-balance opacity-0 ${SIZES[size]} ${className}`}>
      {children}
      {quiet && (
        <>
          {" "}
          <span className={`${heart ? "whitespace-nowrap " : ""}italic ${dark ? "text-on-dark/70" : "text-green-fg"}`}>
            {quiet}
            {heart && (
              // eslint-disable-next-line @next/next/no-img-element -- a small fixed picture sized by the heading's text
              <img
                src="/brand/health-heart.png"
                alt=""
                width={64}
                height={64}
                aria-hidden
                className="ml-[0.12em] inline-block h-[0.62em] w-[0.62em] object-contain align-[0.02em]"
              />
            )}
          </span>
        </>
      )}
    </Tag>
  );
}
