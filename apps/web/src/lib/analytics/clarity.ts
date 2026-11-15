"use client";
import { publicEnv } from "../../config";
import { readPrefs } from "../prefs";

/**
 * Microsoft Clarity (heatmaps and session recordings) for the signed-in app only. Off until NEXT_PUBLIC_CLARITY_PROJECT_ID is set, and off for
 * anyone who turned "Share anonymous usage" off. The dashboard root carries `data-clarity-mask="True"`, so what people write (notes, journal,
 * chats, names) is never recorded. Never pass content, names or emails as tags or events. The desktop app shows this same web app, so it is covered too.
 */
type Clarity = typeof import("@microsoft/clarity").default;

let loaded: Promise<Clarity | null> | null = null;

const allowed = () => readPrefs().analytics;

function load() {
  const id = publicEnv.clarityProjectId;
  if (!id || typeof window === "undefined") return null;
  loaded ??= import("@microsoft/clarity")
    .then((m) => {
      m.default.init(id);
      return m.default;
    })
    .catch(() => null);
  return loaded;
}

/** Start recording, or stop (and drop Clarity's cookies) when the person turned sharing off. Safe to call again. */
export async function syncClarity() {
  if (!allowed()) {
    // Only reach Clarity if it already started; never load it for someone who opted out.
    if (loaded) (await loaded)?.consent(false);
    return;
  }
  const c = await load();
  c?.consent(true);
}

/** The app's own random user id and plan, so recordings can be filtered by plan. */
export async function clarityIdentify(userId: string, plan: string) {
  if (!allowed()) return;
  const c = await load();
  if (!c) return;
  c.identify(userId);
  c.setTag("plan", plan);
  c.setTag("platform", typeof window !== "undefined" && window.naazhiDesktop ? "desktop" : "web");
}

export async function clarityEvent(name: string) {
  if (!allowed()) return;
  (await load())?.event(name);
}
