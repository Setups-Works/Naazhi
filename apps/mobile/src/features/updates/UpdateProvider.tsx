import * as Application from "expo-application";
import * as InAppUpdates from "expo-in-app-updates";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState, Platform } from "react-native";

import { APP_VERSION } from "@/config/version";
import { UpdateRequired } from "./UpdateRequired";

/** The Expo Go app's id: running inside it there is no app of ours to update. */
const EXPO_GO_ID = "host.exp.exponent";

export type UpdateState =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "upToDate" }
  /** A newer version is on Google Play. The app stays blocked behind the update screen until it is installed. */
  | { phase: "required" }
  /** Google Play's own update screen is open. */
  | { phase: "updating" }
  | { phase: "error"; message: string };

type Update = {
  state: UpdateState;
  /** The version of this app (from app.json, bundled with the code), shown in Settings. */
  version: string;
  /** Updates are handled here on Android builds from Google Play; iOS updates come from the store. */
  supported: boolean;
  /** Asks Google Play for a newer version and reports "up to date" or a failure. */
  check: () => Promise<void>;
};

const UpdateContext = createContext<Update | null>(null);

export function useUpdate() {
  const value = useContext(UpdateContext);
  if (!value) throw new Error("useUpdate must be used inside <UpdateProvider>");
  return value;
}

/**
 * Google Play in-app updates (Play Core), mandatory: when Play has a newer version of this app, an immediate update starts and the app
 * stays behind a full-screen "Update required" screen until it is installed (Play restarts the app on the new version). Checks on launch
 * and whenever the app comes back to the foreground. Play only answers for builds installed from Google Play, so a sideloaded or debug
 * build simply reports "up to date".
 */
export function UpdateProvider({ children }: { children: ReactNode }) {
  const version = APP_VERSION;
  // Expo Go is the host app there and has nothing of ours to replace.
  const supported = Platform.OS === "android" && Application.applicationId !== EXPO_GO_ID;
  const [state, setState] = useState<UpdateState>({ phase: "idle" });
  const busy = useRef(false);

  /** Starts Play's immediate update. Resolves false when Play could not open it (the blocking screen offers a retry). */
  const install = useCallback(async () => {
    setState({ phase: "updating" });
    try {
      const started = await InAppUpdates.startUpdate(true);
      if (!started) setState({ phase: "required" });
      return started;
    } catch {
      setState({ phase: "required" });
      return false;
    }
  }, []);

  /** `quiet` is the automatic check: it never shows "up to date" or a failure, only a required update. */
  const run = useCallback(
    async (quiet: boolean) => {
      if (!supported || busy.current) return;
      busy.current = true;
      if (!quiet) setState({ phase: "checking" });
      try {
        const info = await InAppUpdates.checkForUpdate();
        if (info.updateAvailable || info.updateInProgress) {
          setState({ phase: "required" });
          // Also resumes an immediate update that was interrupted (the app was closed or backgrounded mid-update).
          await install();
        } else if (!quiet) setState({ phase: "upToDate" });
        else setState((s) => (s.phase === "checking" ? { phase: "idle" } : s));
      } catch {
        if (!quiet) setState({ phase: "error", message: "Couldn’t reach Google Play. Try again in a moment." });
      } finally {
        busy.current = false;
      }
    },
    [supported, install],
  );

  const check = useCallback(() => run(false), [run]);

  // On launch, and every time the app returns to the foreground (including coming back from a cancelled Play screen).
  useEffect(() => {
    if (!supported) return;
    // Deferred a tick so the first check is not a state change inside the effect body.
    const first = setTimeout(() => void run(true), 0);
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") void run(true);
    });
    const cancelled = InAppUpdates.addUpdateListener("updateCancelled", () => setState({ phase: "required" }));
    const completed = InAppUpdates.addUpdateListener("updateCompleted", () => setState({ phase: "idle" }));
    return () => {
      clearTimeout(first);
      sub.remove();
      cancelled();
      completed();
    };
  }, [supported, run]);

  const value = useMemo<Update>(() => ({ state, version, supported, check }), [state, version, supported, check]);

  return (
    <UpdateContext.Provider value={value}>
      {children}
      <UpdateRequired visible={state.phase === "required" || state.phase === "updating"} updating={state.phase === "updating"} onUpdate={() => void install()} />
    </UpdateContext.Provider>
  );
}
