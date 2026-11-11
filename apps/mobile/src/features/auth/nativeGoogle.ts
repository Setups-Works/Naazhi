import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from "@react-native-google-signin/google-signin";

import { mobileEnv } from "@/config/env";

export type NativeGoogleResult = { token: string } | { cancelled: true } | { unavailable: true };

/**
 * The phone's own Google account sheet. It gives back a Google ID token, which the Naazhi server checks and turns into a session
 * (Better Auth's ID-token sign-in), so no browser and no redirect is involved. `webClientId` is the server's own Google client ID:
 * Google then issues the token for it, which is the one the server accepts.
 */
export async function nativeGoogleSignIn(webClientId: string): Promise<NativeGoogleResult> {
  try {
    GoogleSignin.configure({ webClientId, iosClientId: mobileEnv.googleIosClientId, scopes: ["profile", "email"] });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) return { cancelled: true };
    const token = res.data.idToken;
    return token ? { token } : { unavailable: true };
  } catch (e) {
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS) return { cancelled: true };
      // No Google Play services, or the app build has no native module (Expo Go): the caller falls back to the browser flow.
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return { unavailable: true };
    }
    return { unavailable: true };
  }
}
