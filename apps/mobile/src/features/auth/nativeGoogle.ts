import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from "@react-native-google-signin/google-signin";

import { mobileEnv } from "@/config/env";

/**
 * `unavailable`: the native sheet can't run at all (no Google Play services, or a build without the native module such as Expo Go), so the
 * browser flow is the only way. `failed`: the sheet ran (the person picked an account) but Google or the build's configuration refused,
 * for example error code 10 (DEVELOPER_ERROR) when the app's signing certificate isn't registered for the Google client. Falling back to the
 * browser there would ask for the same Google account a second time and fail the same way, so the caller reports it instead.
 */
export type NativeGoogleResult = { token: string } | { cancelled: true } | { unavailable: true } | { failed: string };

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
    return token ? { token } : { failed: "no-id-token" };
  } catch (e) {
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS) return { cancelled: true };
      // No Google Play services: the caller falls back to the browser flow.
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return { unavailable: true };
      // The sheet ran and was refused (e.g. "10" = DEVELOPER_ERROR, a signing certificate that isn't registered for this client).
      return { failed: String(e.code) };
    }
    // Not a Google Sign-In error at all: the native module isn't in this build (Expo Go), so only the browser flow is possible.
    return { unavailable: true };
  }
}
