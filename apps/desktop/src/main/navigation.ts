import type { BrowserWindow, WebContents } from "electron";
import { IPC } from "../shared/ipc";
import { config } from "./config";

/**
 * Taking the window to a page of the app (a menu item, a shortcut, a deep link). When the signed-in app is showing, the page does the
 * move itself (no reload, nothing lost); on any other page (sign-in, offline) the window simply loads the address.
 */
const ready = new WeakSet<WebContents>();

/** The page says its bridge is mounted (it reports its colours as soon as it is). */
export const markBridgeReady = (contents: WebContents) => ready.add(contents);

/** A full page load throws the old page, and its bridge, away. */
export function watchBridge(win: BrowserWindow): void {
  win.webContents.on("did-start-navigation", (details) => {
    if (details.isMainFrame && !details.isSameDocument) ready.delete(win.webContents);
  });
}

export function goTo(win: BrowserWindow, appPath: string): void {
  if (ready.has(win.webContents)) win.webContents.send(IPC.navigate, appPath);
  else void win.loadURL(`${config.appUrl}${appPath}`);
}
