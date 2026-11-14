"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { INBOX_POLL_MS, notificationTarget, remindAt } from "@untitled/logic";
import type { Inbox } from "@untitled/types";
import { useTasks } from "../../features/tasks/queries";
import { publicPath } from "../../lib/hosts";
import { tokenColor } from "../../lib/cssVar";

/**
 * The web app's side of the desktop app (apps/desktop). Renders nothing, and does nothing in a normal browser.
 *  - Reports the page's colours and top-bar height, so the window's title bar and buttons follow the person's scheme and accent.
 *  - Moves to the page a menu item, shortcut or `naazhi://` link asks for, without reloading.
 */
export default function DesktopBridge() {
  const router = useRouter();
  const { tasks } = useTasks();

  // Messages that reach the inbox while the app is open (a shared-journal invitation, a note from the team) also show as system
  // notifications. What is already there when the app opens is not announced again. A tap opens the page that can act on it: an
  // invitation goes to the shared-journals page, where it is accepted or declined.
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const desktop = window.naazhiDesktop;
    if (!desktop) return;
    let stop = false;
    const check = async () => {
      try {
        const res = await fetch("/api/v1/notifications", { cache: "no-store" });
        if (!res.ok || stop) return;
        const { data } = (await res.json()) as { data?: Inbox };
        const items = data?.items ?? [];
        const first = seen.current === null;
        seen.current ??= new Set();
        for (const n of items) {
          if (seen.current.has(n.id)) continue;
          seen.current.add(n.id);
          if (first || n.read_at) continue;
          const target = notificationTarget(n);
          desktop.notify({ id: n.id, title: n.title, body: n.body, path: target ? (target.startsWith("/dashboard") ? target : `/dashboard${target}`) : "/dashboard/notifications" });
        }
      } catch {
        /* offline: the next check tries again */
      }
    };
    void check();
    const id = window.setInterval(check, INBOX_POLL_MS);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, []);

  // To-dos with a reminder time become system notifications in the desktop app (shown at that time, even with the window closed).
  useEffect(() => {
    const desktop = window.naazhiDesktop;
    if (!desktop) return;
    const now = Date.now();
    desktop.setReminders(
      tasks.flatMap((t) => {
        const at = t.done || t.cancelled || t.archived ? null : remindAt(t);
        return at !== null && at > now ? [{ id: t.id, at, title: t.title, body: "Reminder for your to-do", path: "/dashboard/todo" }] : [];
      }),
    );
  }, [tasks]);

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
