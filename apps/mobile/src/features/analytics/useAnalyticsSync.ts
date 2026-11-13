import { useEffect } from "react";
import { usePathname } from "expo-router";
import { useRuntimePrefs } from "@/lib/preferences";
import { identify, syncAnalytics, trackScreen } from "./index";

/** Screen views, the signed-in person's id and plan, and the "Share anonymous usage" setting for Firebase Analytics. Call once in the signed-in shell. */
export function useAnalyticsSync(userId: string | null, plan: string | null) {
  const pathname = usePathname();
  const { analytics } = useRuntimePrefs();
  useEffect(() => {
    syncAnalytics();
  }, [analytics]);
  useEffect(() => {
    identify(userId, { plan: plan ?? "none" });
  }, [userId, plan, analytics]);
  useEffect(() => {
    if (userId) trackScreen(pathname);
  }, [pathname, userId]);
}
