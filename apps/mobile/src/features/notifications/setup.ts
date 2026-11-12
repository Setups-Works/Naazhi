/* eslint-disable import/namespace -- on the CI runner (Node 22) the rule cannot see expo-notifications’ enums (AndroidImportance); TypeScript checks them, and it passes locally. */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { CHANNEL } from "./constants";

let done = false;

/** Once per launch: how a notification looks while the app is open, and the Android channels. Safe to call again. */
export async function configureNotifications() {
  if (done || Platform.OS === "web") return;
  done = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL.messages, {
      name: "Messages",
      description: "Messages from the team and invitations",
      importance: Notifications.AndroidImportance.HIGH,
    }).catch(() => undefined);
    await Notifications.setNotificationChannelAsync(CHANNEL.reminders, {
      name: "Reminders",
      description: "To-dos, journal and events",
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => undefined);
  }
}

/** True when the person has allowed notifications in the system settings. */
export async function permissionGranted(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync().catch(() => null))?.granted === true;
}

/** Asks the system for permission (a no-op prompt if already decided). */
export async function askPermission(): Promise<boolean> {
  if (await permissionGranted()) return true;
  return (await Notifications.requestPermissionsAsync().catch(() => null))?.granted === true;
}
