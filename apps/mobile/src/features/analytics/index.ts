import { getAnalytics, logEvent, logScreenView, setAnalyticsCollectionEnabled, setUserId, setUserProperties } from "@react-native-firebase/analytics";
import { getRuntimePrefs } from "@/lib/preferences";

/**
 * Firebase Analytics for the phone. Needs the Firebase files at build time (see app.config.js); without them the native module is absent and
 * every call here quietly does nothing. Off for anyone who turned "Share anonymous usage" off. Never pass note, journal, chat or file content,
 * names or emails as parameters.
 */
type Params = Record<string, string | number | boolean>;

const on = () => getRuntimePrefs().analytics;
const safe = (run: () => unknown) => {
  try {
    void Promise.resolve(run()).catch(() => undefined);
  } catch {
    /* native module not in this build */
  }
};

/** Start or stop collecting to match the person's setting. */
export const syncAnalytics = () => safe(() => setAnalyticsCollectionEnabled(getAnalytics(), on()));

export function identify(userId: string | null, props: Record<string, string | null> = {}) {
  if (!on()) return;
  safe(() => setUserId(getAnalytics(), userId));
  if (userId) safe(() => setUserProperties(getAnalytics(), props));
}

export function track(name: string, params: Params = {}) {
  if (on()) safe(() => logEvent(getAnalytics(), name, params));
}

const ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d{4,}/gi;
/** A screen view with ids removed from the path (/note/<uuid> reports as /note/:id). */
export function trackScreen(pathname: string) {
  if (on()) safe(() => logScreenView(getAnalytics(), { screen_name: pathname.replace(ID, ":id"), screen_class: "expo-router" }));
}
