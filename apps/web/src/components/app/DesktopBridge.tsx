"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { publicPath } from "../../lib/hosts";
import { tokenColor } from "../../lib/cssVar";

/**
 * The web app's side of the desktop app (apps/desktop). Renders nothing, and does nothing in a normal browser.
 *  - Reports the page's colours and top-bar height, so the window's title bar and buttons follow the person's scheme and accent.
 *  - Moves to the page a menu item, shortcut or `naazhi://` link asks for, without reloading.
 */
export default function DesktopBridge() {
  const router = useRouter();

  useEffect(() => {
    const desktop = window.naazhiDesktop;
    if (!desktop) return;
    const report = () => {
      const barHeight = document.querySelector<HTMLElement>(".ap-top")?.offsetHeight;
      if (!barHeight) return;
      desktop.setChrome({ background: tokenColor("var(--page)"), foreground: tokenColor("var(--fg)"), barHeight });
    };
    report();
    // The scheme (class) and accent (data-accent) are set on <html> by PrefsSync, possibly after this mounts.
    const watch = new MutationObserver(report);
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-accent"] });
    const stop = desktop.onNavigate((path) => router.push(publicPath(path)));
    return () => {
      watch.disconnect();
      stop();
    };
  }, [router]);

  return null;
}
