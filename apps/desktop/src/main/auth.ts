import { dialog, session, shell } from "electron";
import { config } from "./config";
import { mainWindow, showMainWindow } from "./window";

/**
 * Signing in with Google. Google refuses sign-in inside an embedded window, so the shell hands over to the person's real browser:
 *
 *  1. The page asks the shell to sign in; the shell opens `<app>/desktop-signin` in the system browser.
 *  2. There the person signs in as usual and presses "Open Naazhi". The web app makes a one-time token (Better Auth's one-time-token
 *     plugin: valid for minutes, single use) and opens `naazhi://auth?token=…`.
 *  3. The shell trades the token for a session cookie in its own window, then loads the app.
 *
 * Email and password and passkeys sign in inside the window and don't need this.
 */
export function startBrowserSignIn(code?: string): void {
  // The code is six letters and digits; anything else is dropped so the page never receives text it did not ask for.
  const valid = code && /^[A-HJ-NP-Z2-9]{6}$/.test(code) ? code : null;
  void shell.openExternal(`${config.appUrl}/desktop-signin${valid ? `?code=${valid}` : ""}`);
}

export async function finishBrowserSignIn(token: string): Promise<void> {
  const win = showMainWindow();
  try {
    // Origin is sent because Better Auth checks it on every request that changes state.
    const response = await session.defaultSession.fetch(`${config.appUrl}/api/auth/one-time-token/verify`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: config.appOrigin },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) throw new Error(`verify failed with ${response.status}`);
    if (!win.isDestroyed()) await win.loadURL(config.startUrl);
  } catch {
    // Details stay out of the message (they could name an address); the person just needs to know to try again.
    await dialog.showMessageBox(mainWindow() ?? win, {
      type: "info",
      message: "Couldn’t sign you in.",
      detail: "The sign-in link may have expired. Choose Continue with Google again.",
    });
  }
}
