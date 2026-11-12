"use client";
import { useEffect } from "react";

/** Opens the `<details>` the address points at (`/faq#some-question`) on arrival and when the hash changes, then scrolls it into view. */
export default function OpenOnHash() {
  useEffect(() => {
    let timer: number | undefined;
    const target = () => {
      const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      return el instanceof HTMLDetailsElement ? el : null;
    };
    const open = () => {
      if (!target()) return;
      // The page is still settling (entrance animation, fonts), and its list can be re-created as it finishes loading, so wait, then
      // look the answer up again before opening it, or the browser pulls the page back to the top.
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const el = target();
        if (!el) return;
        el.open = true;
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 700);
    };
    open();
    window.addEventListener("hashchange", open);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", open);
    };
  }, []);
  return null;
}
