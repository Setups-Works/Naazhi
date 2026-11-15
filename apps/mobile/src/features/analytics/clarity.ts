import * as Clarity from "@microsoft/react-native-clarity";
import { mobileEnv } from "@/config/env";
import { getRuntimePrefs } from "@/lib/preferences";

/**
 * Microsoft Clarity (session replay and heatmaps) for the phone, signed-in shell only. Off until EXPO_PUBLIC_CLARITY_PROJECT_ID is set, and off for
 * anyone who turned "Share anonymous usage" off. Set the Clarity project's masking to Strict (Clarity → Settings → Masking) so typed and
 * written text is never recorded. Never pass content, names or emails as tags or events. Needs a native build (not Expo Go): without the module every call does nothing.
 */
const on = () => getRuntimePrefs().analytics && !!mobileEnv.clarityProjectId;
const safe = (run: () => unknown) => {
  try {
    void Promise.resolve(run()).catch(() => undefined);
  } catch {
    /* native module not in this build */
  }
};

let started = false;

/** Start, pause or resume recording to match the person's setting. Safe to call again. */
export function syncClarity() {
  const id = mobileEnv.clarityProjectId;
  if (!id) return;
  if (on()) {
    if (!started) {
      started = true;
      safe(() => Clarity.initialize(id, { logLevel: __DEV__ ? Clarity.LogLevel.Verbose : Clarity.LogLevel.None }));
    } else safe(() => Clarity.resume());
  } else if (started) safe(() => Clarity.pause());
}

export function clarityIdentify(userId: string | null, plan: string | null) {
  if (!on() || !userId) return;
  safe(() => Clarity.setCustomUserId(userId));
  safe(() => Clarity.setCustomTag("plan", plan ?? "none"));
  safe(() => Clarity.setCustomTag("platform", "app"));
}

export const clarityEvent = (name: string) => {
  if (on()) safe(() => Clarity.sendCustomEvent(name));
};

const ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d{4,}/gi;
export const clarityScreen = (pathname: string) => {
  if (on()) safe(() => Clarity.setCurrentScreenName(pathname.replace(ID, ":id")));
};
