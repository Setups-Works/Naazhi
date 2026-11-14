import { Notification } from "electron";
import type { DesktopReminder } from "@untitled/types";
import { config } from "./config";
import { goTo } from "./navigation";
import { showMainWindow } from "./window";

/**
 * Reminders as system notifications. The page (DesktopBridge) hands over the reminders it knows about (to-dos with a reminder time);
 * they are kept here, in the main process, so one still fires when the window is closed (macOS keeps the app running). Clicking one opens
 * the window on the right page. They live in memory only: the page sends them again each time it loads.
 */
const MAX = 300;
const HOUR = 3_600_000;
// setTimeout cannot wait longer than about 24 days; a reminder further out than a day is picked up by the hourly pass.
const WINDOW = 24 * HOUR;

let pending: DesktopReminder[] = [];
const timers = new Map<string, NodeJS.Timeout>();
const shown = new Set<string>();
let sweep: NodeJS.Timeout | null = null;

const isReminder = (r: unknown): r is DesktopReminder => {
  if (!r || typeof r !== "object") return false;
  const x = r as Record<string, unknown>;
  return (
    typeof x.id === "string" && x.id.length > 0 && x.id.length <= 100 &&
    typeof x.at === "number" && Number.isFinite(x.at) &&
    typeof x.title === "string" && typeof x.body === "string" &&
    typeof x.path === "string" && x.path.startsWith("/") && !x.path.startsWith("//")
  );
};

function show(r: DesktopReminder): void {
  const key = `${r.id}@${r.at}`;
  if (shown.has(key) || !Notification.isSupported()) return;
  shown.add(key);
  const n = new Notification({ title: r.title.slice(0, 200) || config.productName, body: r.body.slice(0, 300) });
  n.on("click", () => goTo(showMainWindow(), r.path));
  n.show();
}

function arm(): void {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
  const now = Date.now();
  for (const r of pending) {
    if (r.at <= now) continue; // already past: it was due while the app was closed, and a late reminder is noise
    if (r.at - now > WINDOW) continue;
    timers.set(`${r.id}@${r.at}`, setTimeout(() => show(r), r.at - now));
  }
}

/** Shows one notification now (same checks as a reminder; the id keeps a message from showing twice). */
export function notifyNow(input: unknown): void {
  if (isReminder({ ...(input as object), at: 0 })) show({ ...(input as DesktopReminder), at: 0 });
}

/** Replaces the list. Anything malformed is dropped, so the page can never make the shell show arbitrary text paths. */
export function setReminders(input: unknown): void {
  pending = (Array.isArray(input) ? input : []).filter(isReminder).slice(0, MAX);
  arm();
  sweep ??= setInterval(arm, HOUR);
}
