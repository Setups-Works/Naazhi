import { app, ipcMain, session, type WebContents } from "electron";
import { IPC, type BootInfo } from "../shared/ipc";
import { startBrowserSignIn } from "./auth";
import { notifyNow, setReminders } from "./reminders";
import { applyChrome, cleanChrome, LIGHTS_FOOTPRINT } from "./chrome";
import { config, isAppUrl, platform } from "./config";
import * as deepLink from "./deepLink";
import { buildMenu } from "./menu";
import { markBridgeReady } from "./navigation";
import { setupTray } from "./tray";
import { setupUpdater } from "./updater";
import { createMainWindow, mainWindow, showMainWindow } from "./window";

app.setName(config.productName);
// Say which app is calling, so the account's device list can show "Desktop app" instead of a bare browser. The Electron token stays.
app.userAgentFallback = `${app.userAgentFallback} NaazhiDesktop/${config.version}`;

if (!deepLink.listen()) {
  // Another copy is running; it receives our launch arguments and comes to the front.
  app.quit();
} else {
  deepLink.registerScheme();

  /** Only pages of the app itself may talk to the shell, and only the frame the app is showing. */
  const fromApp = (contents: WebContents) => isAppUrl(contents.getURL()) || contents.getURL().startsWith("file:");

  ipcMain.on(IPC.boot, (event) => {
    const info: BootInfo = {
      platform,
      version: config.version,
      insetLeft: platform === "mac" ? LIGHTS_FOOTPRINT : 0,
    };
    event.returnValue = info;
  });
  ipcMain.handle(IPC.signIn, (event, code: unknown) => {
    if (fromApp(event.sender)) startBrowserSignIn(typeof code === "string" ? code : undefined);
  });
  ipcMain.on(IPC.notify, (event, input: unknown) => {
    if (fromApp(event.sender)) notifyNow(input);
  });
  ipcMain.on(IPC.reminders, (event, input: unknown) => {
    if (fromApp(event.sender)) setReminders(input);
  });
  ipcMain.on(IPC.chrome, (event, input: unknown) => {
    const win = mainWindow();
    const chrome = cleanChrome(input);
    if (!win || !chrome || !fromApp(event.sender)) return;
    markBridgeReady(event.sender);
    applyChrome(win, chrome);
  });

  app.whenReady().then(() => {
    // The page may use notifications, the clipboard and the microphone (voice notes); nothing else.
    const allowed = new Set(["notifications", "clipboard-sanitized-write", "media", "fullscreen"]);
    session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => callback(allowed.has(permission) && isAppUrl(contents.getURL())));
    session.defaultSession.setPermissionCheckHandler((_contents, permission, origin) => allowed.has(permission) && isAppUrl(origin));

    buildMenu();
    createMainWindow();
    setupTray();
    setupUpdater();
    deepLink.flush();

    // macOS keeps the app running with no windows; clicking the dock icon brings one back.
    app.on("activate", () => showMainWindow());
  });

  // Another webview inside a page is never needed: refuse it.
  app.on("web-contents-created", (_event, contents) => {
    contents.on("will-attach-webview", (event) => event.preventDefault());
  });

  app.on("window-all-closed", () => {
    if (platform !== "mac") app.quit();
  });
}
