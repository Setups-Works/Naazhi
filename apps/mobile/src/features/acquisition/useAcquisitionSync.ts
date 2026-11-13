import * as Application from "expo-application";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { Platform } from "react-native";

import { api } from "@/lib/api";

/**
 * The first time a signed-in person opens the app, tell the server where they came from. On Android that is the Google Play install
 * referrer: the tags that were on the Play link they followed (see "Make a tracked link" in Admin → Analytics). Nothing else about the
 * phone or the person is sent, and the server keeps the first answer only, so asking again is harmless.
 */
export function useAcquisitionSync(userId: string | null) {
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const key = `naazhi_acq_${userId}`;
    (async () => {
      try {
        if (await SecureStore.getItemAsync(key)) return;
        let referrer = "";
        if (Platform.OS === "android") referrer = (await Application.getInstallReferrerAsync().catch(() => "")) || "";
        if (cancelled) return;
        await api.post("/api/v1/acquisition", { referrer: referrer.slice(0, 400), platform: Platform.OS === "ios" ? "ios" : "android" });
        await SecureStore.setItemAsync(key, "1");
      } catch {
        /* offline or signed out: the next launch tries again */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);
}
