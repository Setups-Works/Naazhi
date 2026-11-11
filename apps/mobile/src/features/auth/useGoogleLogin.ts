import * as ExpoLinking from "expo-linking";
import { useState } from "react";
import { friendlyAuthError } from "@untitled/validation";

import { nativeGoogleSignIn } from "./nativeGoogle";
import type { AuthConfig } from "./useAuthConfig";
import type { MobileAuthClient } from "@/lib/auth-client";

/**
 * "Continue with Google": the phone's own Google sheet first (no browser), and the web redirect only when the native one isn't available
 * (a build without the native module, or no Google Play services).
 */
export function useGoogleLogin(auth: MobileAuthClient, config: AuthConfig | undefined, onError: (message: string) => void) {
  const [busy, setBusy] = useState(false);

  async function run() {
    onError("");
    setBusy(true);
    try {
      const native = config?.googleClientId ? await nativeGoogleSignIn(config.googleClientId) : { unavailable: true as const };
      if ("cancelled" in native) return;
      if ("token" in native) {
        const res = await auth.signIn.social({ provider: "google", idToken: { token: native.token } });
        if (res?.error) onError(friendlyAuthError(res.error.message ?? "Couldn’t sign in with Google."));
        return;
      }
      const res = await auth.signIn.social({ provider: "google", callbackURL: ExpoLinking.createURL("/") });
      if (res?.error) onError(friendlyAuthError(res.error.message ?? "Couldn’t start Google sign-in."));
    } catch {
      onError("Google sign-in was cancelled or couldn’t finish. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return { busy, run };
}
