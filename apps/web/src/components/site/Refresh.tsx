"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initGsap } from "./motion";

/** Keeps ScrollTrigger measurements right after fonts, images and route changes settle. Renders nothing. */
export default function Refresh() {
  const path = usePathname();
  useEffect(() => {
    initGsap();
    const refresh = () => ScrollTrigger.refresh();
    const t = setTimeout(refresh, 400);
    void document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh);
    return () => {
      clearTimeout(t);
      window.removeEventListener("load", refresh);
    };
  }, [path]);
  return null;
}
