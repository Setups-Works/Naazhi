import { Linking, Platform } from "react-native";
import { useSyncExternalStore } from "react";

export type WebTarget = {
  url: string;
  title?: string;
  /** Called when the sheet closes (for example to read a connection's status again). */
  onClose?: () => void;
  /** Closes the sheet by itself when the page navigates to an address this accepts (the end of a sign-in, say). */
  closeOn?: (url: string) => boolean;
};

let current: WebTarget | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/**
 * Opens a web page in a sheet that slides up inside the app, instead of the system browser in a new tab. Anything that isn't a web page
 * (mailto:, tel:, an app link) is handed to the phone as usual. On the web preview there is no sheet, so the page opens in a new tab.
 */
export function openWeb(url: string, options: Omit<WebTarget, "url"> = {}) {
  if (Platform.OS === "web" || !/^https?:\/\//i.test(url)) return void Linking.openURL(url).catch(() => undefined);
  current = { url, ...options };
  emit();
}

export function closeWeb() {
  const done = current?.onClose;
  current = null;
  emit();
  done?.();
}

export const useWebTarget = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );
