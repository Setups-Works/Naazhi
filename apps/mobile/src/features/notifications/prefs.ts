import AsyncStorage from "@react-native-async-storage/async-storage";

/** What this phone has been asked to remind about. Kept on the phone per account: it is a device setting, not account data. */
export type NotificationPrefs = {
  /** The master switch. Turning it on asks the system for permission. */
  enabled: boolean;
  tasks: boolean;
  journal: boolean;
  events: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = { enabled: false, tasks: true, journal: true, events: true };

const key = (userId: string) => `notification-prefs:${userId}`;

export async function readPrefs(userId: string): Promise<NotificationPrefs> {
  try {
    const raw = JSON.parse((await AsyncStorage.getItem(key(userId))) ?? "null") as Partial<NotificationPrefs> | null;
    return {
      enabled: raw?.enabled === true,
      tasks: raw?.tasks !== false,
      journal: raw?.journal !== false,
      events: raw?.events !== false,
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

export const writePrefs = (userId: string, prefs: NotificationPrefs) =>
  AsyncStorage.setItem(key(userId), JSON.stringify(prefs)).catch(() => undefined);
