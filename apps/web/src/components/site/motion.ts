"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useEffect, type RefObject } from "react";

let registered = false;

/** Registers the GSAP plugins once, in the browser only. */
export function initGsap() {
  if (!registered && typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    registered = true;
  }
  return gsap;
}

export type MotionContext = {
  g: typeof gsap;
  /** The element the animation is scoped to. */
  root: HTMLElement;
  /** True when the visitor asked for less motion (the OS setting or the app's "Reduce motion"): show the content and skip the choreography. */
  calm: boolean;
};

/**
 * Runs `setup` with GSAP scoped to `ref`, and reverts every tween and ScrollTrigger it made when the component goes away or when the
 * visitor's reduced-motion setting changes. In calm mode `setup` should only make sure the content is visible.
 */
export function useMotion(ref: RefObject<HTMLElement | null>, setup: (c: MotionContext) => void | (() => void), deps: unknown[] = []) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const g = initGsap();
    const mm = g.matchMedia();
    mm.add(
      { ok: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" },
      (ctx) => {
        const calm = Boolean(ctx.conditions?.reduce) || document.documentElement.dataset.motion === "reduce";
        return setup({ g, root, calm });
      },
      root,
    );
    return () => mm.revert();
    // The setup closes over refs only; callers pass `deps` when it depends on props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Content that animates in starts hidden (`opacity-0` and `data-reveal`); this makes it visible without the choreography. */
export const showNow = (g: typeof gsap, targets: gsap.TweenTarget) => g.set(targets, { autoAlpha: 1, clearProps: "transform" });

/** Resolves once web fonts are loaded, so text is split on its real line breaks. */
export const fontsReady = () => (typeof document !== "undefined" && document.fonts ? document.fonts.ready : Promise.resolve());
