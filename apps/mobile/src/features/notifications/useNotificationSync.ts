import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
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

/** A tapped notification opens the screen it names (an in-app path set by the server or the reminder planner). */
function open(response: Notifications.NotificationResponse | null) {
  const url = response?.notification.request.content.data?.url;
  if (typeof url === "string" && url.startsWith("/")) router.push(url as never);
}

/**
 * Keeps notifications in step with the app: sets them up at launch, re-registers the phone and replans the reminders when someone is
 * signed in and the app opens or returns to the foreground, clears them on sign-out, and opens the right screen when one is tapped.
 * Mount once, near the root.
 */
export function useNotificationSync(userId: string | null) {
  useEffect(() => {
    if (Platform.OS === "web") return;
    void configureNotifications();
    open(Notifications.getLastNotificationResponse());
    const tap = Notifications.addNotificationResponseReceivedListener(open);
    return () => tap.remove();
  }, []);

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
