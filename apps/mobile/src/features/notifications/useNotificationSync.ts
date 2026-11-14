import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";

import { REPLAN_MIN_MS } from "./constants";
import { readPrefs } from "./prefs";
import { registerPush } from "./push";
import { replanReminders, clearReminders } from "./reminders";
import { configureNotifications, permissionGranted } from "./setup";

let lastReplan = 0;
let replanNow: (() => void) | null = null;

/** Plans the phone's reminders again now (after a to-do is saved, so a new reminder time takes effect without reopening the app). */
export const requestReplan = () => replanNow?.();

/** The screen a tap asked for, kept until the navigator can show it (a tap that launches the app arrives before any screen exists). */
let waiting: string | null = null;

/** A tapped notification names a screen (an in-app path set by the server or the reminder planner); `go` opens it or holds it. */
function open(response: Notifications.NotificationResponse | null, go: boolean) {
  const url = response?.notification.request.content.data?.url;
  if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//")) return;
  if (go) router.push(url as never);
  else waiting = url;
}

/**
 * Keeps notifications in step with the app: sets them up at launch, re-registers the phone and replans the reminders when someone is
 * signed in and the app opens or returns to the foreground, clears them on sign-out, and opens the right screen when one is tapped.
 * Mount once, near the root.
 */
export function useNotificationSync(userId: string | null, ready = true) {
  const canOpen = ready && userId !== null;
  const canOpenRef = useRef(canOpen);
  useEffect(() => {
    canOpenRef.current = canOpen;
  }, [canOpen]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    void configureNotifications();
    open(Notifications.getLastNotificationResponse(), false);
    const tap = Notifications.addNotificationResponseReceivedListener((r) => open(r, canOpenRef.current));
    return () => tap.remove();
  }, []);

  // Signed in and the screens are up: open what a tap asked for while the app was starting (or signed out).
  useEffect(() => {
    if (!canOpen || !waiting) return;
    const url = waiting;
    waiting = null;
    const timer = setTimeout(() => router.push(url as never), 100);
    return () => clearTimeout(timer);
  }, [canOpen]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!userId) {
      lastReplan = 0;
      void clearReminders();
      return;
    }
    async function run(force: boolean) {
      if (!force && Date.now() - lastReplan < REPLAN_MIN_MS) return;
      lastReplan = Date.now();
      const prefs = await readPrefs(userId!);
      // Switched on in the app but turned off later in the system settings: treat it as off until they come back and enable it.
      if (prefs.enabled && !(await permissionGranted())) return;
      if (prefs.enabled) void registerPush();
      await replanReminders(prefs);
    }
    void run(true).catch(() => undefined);
    replanNow = () => void run(true).catch(() => undefined);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void run(false).catch(() => undefined);
    });
    return () => {
      sub.remove();
      replanNow = null;
    };
  }, [userId]);
}
