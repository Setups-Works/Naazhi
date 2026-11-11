"use client";
import { useEffect } from "react";
import { api } from "../../lib/api/client";
import { isoDate } from "../../lib/dates";

const DAY_KEY = "naazhi_web_brief_day";

/**
 * The morning brief on the web: once a day, while Naazhi is open, a browser notification says what is due today. It needs the
 * person's switch (Settings, or the permissions step of onboarding) and the browser's permission; with either missing it does nothing.
 * It reads the person's own to-dos with their own permissions, and never puts a to-do's text anywhere but their own notification.
 */
export default function WebBrief({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const today = isoDate();
    try {
      if (window.localStorage.getItem(DAY_KEY) === today) return;
    } catch {
      /* storage unavailable: at worst the brief shows again on the next visit */
    }
    let live = true;
    void (async () => {
      const { data, error } = await api()
        .from("tasks")
        .select("title,due_date")
        .eq("done", false)
        .eq("cancelled", false)
        .eq("archived", false)
        .lte("due_date", today)
        .order("due_date")
        .limit(50);
      if (!live || error || !data || data.length === 0) return;
      const titles = (data as { title: string }[]).map((t) => t.title);
      const body = titles.length === 1 ? titles[0] : `${titles.slice(0, 2).join(", ")}${titles.length > 2 ? ` and ${titles.length - 2} more` : ""}`;
      new Notification(titles.length === 1 ? "1 thing for today" : `${titles.length} things for today`, { body, tag: "naazhi-brief" });
      try {
        window.localStorage.setItem(DAY_KEY, today);
      } catch {
        /* see above */
      }
    })();
    return () => {
      live = false;
    };
  }, [enabled]);
  return null;
}
