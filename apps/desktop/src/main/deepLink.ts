import { app } from "electron";
import path from "node:path";
import { deepLinkPath } from "@untitled/types";
import { finishBrowserSignIn } from "./auth";
import { config } from "./config";
import { goTo } from "./navigation";
import { showMainWindow } from "./window";

/**
 * `naazhi://` links: `naazhi://notes/<id>` opens that page, `naazhi://auth?token=…` finishes a browser sign-in. They arrive differently per
 * system (macOS: an event; Windows and Linux: the launch arguments of a second copy of the app), so everything funnels through handle().
 */
let pending: string | null = null;
let ready = false;

export function registerScheme(): void {
  // Run from `electron .` (development) the system must be told to start Electron with our script as well.
  if (process.defaultApp && process.argv[1]) app.setAsDefaultProtocolClient(config.scheme, process.execPath, [path.resolve(process.argv[1])]);
  else app.setAsDefaultProtocolClient(config.scheme);
}

const fromArgv = (argv: string[]) => argv.find((a) => a.startsWith(`${config.scheme}://`)) ?? null;

export function handle(link: string): void {
  if (!ready) {
    pending = link;
    return;
  }
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return;
  }
  if (url.protocol !== `${config.scheme}:`) return;
  if (url.hostname === "auth") {
    const token = url.searchParams.get("token");
    // Tokens are short random strings; anything else is not ours.
    if (token && /^[\w-]{8,256}$/.test(token)) void finishBrowserSignIn(token);
    return;
  }
  const appPath = deepLinkPath(url);
  if (appPath) goTo(showMainWindow(), appPath);
  else showMainWindow();
}

/** Starts listening; call once, before the app is ready. Returns false when another copy is already running (this one should quit). */
export function listen(): boolean {
  if (!app.requestSingleInstanceLock()) return false;
  app.on("second-instance", (_event, argv) => {
    const link = fromArgv(argv);
    if (link) handle(link);
    else showMainWindow();
  });
  app.on("open-url", (event, link) => {
    event.preventDefault();
    handle(link);
  });
  pending = fromArgv(process.argv);
  return true;
}

/** Called once the window exists: links that arrived while the app was starting are handled now. */
export function flush(): void {
  ready = true;
  if (pending) {
    const link = pending;
    pending = null;
    handle(link);
  }
}
