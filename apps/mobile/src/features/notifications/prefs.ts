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
/** What the person chose in the introduction, before any account exists on this phone. */
const DEVICE_CHOICE_KEY = "notification-device-choice";

export const readDeviceChoice = async (): Promise<boolean> => (await AsyncStorage.getItem(DEVICE_CHOICE_KEY).catch(() => null)) === "on";

export const writeDeviceChoice = (on: boolean) => AsyncStorage.setItem(DEVICE_CHOICE_KEY, on ? "on" : "off").catch(() => undefined);

/**
 * The account's saved switches. An account that has never saved any starts from what was chosen in the introduction, so allowing
 * notifications there turns them on for the account that is created or signed in afterwards.
 */
export async function readPrefs(userId: string): Promise<NotificationPrefs> {
  try {
    const stored = await AsyncStorage.getItem(key(userId));
    if (stored === null) return { ...DEFAULT_NOTIFICATION_PREFS, enabled: await readDeviceChoice() };
    const raw = JSON.parse(stored) as Partial<NotificationPrefs> | null;
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
