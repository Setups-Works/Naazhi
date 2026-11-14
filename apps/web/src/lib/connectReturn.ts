/**
 * Where to send the person after an app's sign-in (Google, Notion). The sign-in leaves the site and comes back to a callback route, which
 * can't know where the person started, so the page that starts it leaves a short-lived cookie with its own path. Only the onboarding steps and the
 * Notes page (which reopens its Notion popup) are accepted; anything else is ignored and the callback uses its default (the Settings page).
 */
export const CONNECT_RETURN_COOKIE = "connect_return";
const ALLOWED = /^(\/onboarding\/[a-z0-9-]{1,30}|\/dashboard\/notes)$/;
const MAX_AGE_SECONDS = 900;

/** Browser: remember the page to come back to (call just before sending the person to the sign-in). */
export function rememberConnectReturn(path: string): void {
  if (!ALLOWED.test(path)) return;
  document.cookie = `${CONNECT_RETURN_COOKIE}=${encodeURIComponent(path)}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax`;
}

/** Server: the remembered path from a request's cookie header, or null. */
export function readConnectReturn(cookieHeader: string | null): string | null {
  const m = new RegExp(`(?:^|;\\s*)${CONNECT_RETURN_COOKIE}=([^;]+)`).exec(cookieHeader ?? "");
  if (!m) return null;
  try {
    const path = decodeURIComponent(m[1]);
    return ALLOWED.test(path) ? path : null;
  } catch {
    return null;
  }
}
