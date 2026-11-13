"use client";
import { publicEnv } from "../../config";
import { readPrefs } from "../prefs";

/**
 * Firebase Analytics (Google Analytics 4) for the signed-in app only. Off until the Firebase web config is set, and off for anyone who
 * turned "Share anonymous usage" off. Never pass note, journal, chat or file content, names or emails as event parameters.
 */
type Params = Record<string, string | number | boolean>;
type Fa = typeof import("firebase/analytics");

let ready: Promise<{ fa: Fa; analytics: import("firebase/analytics").Analytics } | null> | null = null;

const configured = () => !!(publicEnv.firebase.apiKey && publicEnv.firebase.appId && publicEnv.firebase.measurementId);

function load() {
  if (!configured() || typeof window === "undefined") return null;
  ready ??= (async () => {
    try {
      const [{ initializeApp, getApps, getApp }, fa] = await Promise.all([import("firebase/app"), import("firebase/analytics")]);
      if (!(await fa.isSupported())) return null;
      const app = getApps().length ? getApp() : initializeApp(publicEnv.firebase);
      return { fa, analytics: fa.getAnalytics(app) };
    } catch {
      return null;
    }
  })();
  return ready;
}

const allowed = () => readPrefs().analytics;

/** Start collecting (or stop, when the person turned it off). Safe to call again. */
export async function syncAnalytics() {
  const a = await load();
  if (a) a.fa.setAnalyticsCollectionEnabled(a.analytics, allowed());
}

/** The app's own user id (a random UUID) and plan, so Audiences and Custom definitions can group people. */
export async function identify(userId: string, props: Params = {}) {
  if (!allowed()) return;
  const a = await load();
  if (!a) return;
  a.fa.setUserId(a.analytics, userId);
  a.fa.setUserProperties(a.analytics, props);
}

export async function track(name: string, params: Params = {}) {
  if (!allowed()) return;
  const a = await load();
  if (a) a.fa.logEvent(a.analytics, name, params);
}

const ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d{4,}/gi;
/** A page view with ids removed from the path, so /dashboard/notes/<uuid> reports as /dashboard/notes/:id. */
export function trackPage(pathname: string) {
  const page_path = pathname.replace(ID, ":id");
  return track("page_view", { page_path, page_location: window.location.origin + page_path, page_title: document.title });
}
