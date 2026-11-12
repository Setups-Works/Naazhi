"use client";
import { useEffect, useState } from "react";
import DotGrid from "../../ui/DotGrid";

/** A colour token (`--ink-4`…) as the hex the dot grid wants; the tokens are plain hex in both schemes. */
const token = (name: string) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v.startsWith("#") ? v : null;
};

/**
 * The dot grid behind the home page's opening (React Bits "Dot Grid"): quiet dots that swell, stretch and glow as the pointer moves
 * through them, and ripple on a click. Colours come from the design tokens and follow the light/dark switch.
 */
export default function HeroDots() {
  const [colors, setColors] = useState<{ base: string; active: string } | null>(null);
  useEffect(() => {
    const read = () => {
      const base = token("--ink-4");
      const active = token("--ink");
      setColors(base && active ? { base, active } : null);
    };
    read();
    // The theme is a class (and data attribute) on <html>; re-read when it flips.
    const watch = new MutationObserver(read);
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => watch.disconnect();
  }, []);
  if (!colors) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute -inset-x-[12vw] -top-20 -bottom-6">
      <DotGrid baseColor={colors.base} activeColor={colors.active} dotSize={4} gap={20} opacity={0.3} fade={0.3} glow={0.35} />
    </div>
  );
}
