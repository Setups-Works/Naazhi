import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { api } from "@/lib/api";

/**
 * Tells the server this phone's push address so messages can reach it. Returns false when the build has no push set up (no Firebase
 * file) or the system refuses: the inbox and the phone's own reminders still work then.
 */
export async function registerPush(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { data } = await Notifications.getDevicePushTokenAsync();
    if (typeof data !== "string") return false;
    await api.post("/api/v1/notifications/devices", { token: data, platform: Platform.OS === "ios" ? "ios" : "android" });
    return true;
  } catch {
    return false;
  }
}

/** Forgets this phone on the server (turning notifications off, or just before signing out). */
export async function unregisterPush(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const { data } = await Notifications.getDevicePushTokenAsync();
    if (typeof data === "string") await api.post("/api/v1/notifications/devices/remove", { token: data });
  } catch {
    /* nothing registered, or offline */
  }
}
