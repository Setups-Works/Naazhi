import { contextBridge, ipcRenderer } from "electron";
import type { DesktopChrome, NaazhiDesktopApi } from "@untitled/types";
import { IPC, type BootInfo } from "../shared/ipc";

/**
 * Runs before the page, in an isolated world. It exposes `window.naazhiDesktop` (typed in packages/types/src/desktop.ts) and tells the page's
 * stylesheet it is inside the desktop app: `<html data-desktop="mac|win|linux">` and `--desktop-inset-left`, which the web app's CSS uses
 * to keep its top bar clear of the window buttons.
 */
const boot = ipcRenderer.sendSync(IPC.boot) as BootInfo;

const api: NaazhiDesktopApi = {
  platform: boot.platform,
  version: boot.version,
  signInWithBrowser: () => ipcRenderer.invoke(IPC.signIn),
  setChrome: (chrome: DesktopChrome) => ipcRenderer.send(IPC.chrome, chrome),
  onNavigate(listener) {
    const handler = (_event: unknown, path: unknown) => {
      // Only plain app paths; the page decides how to go there.
      if (typeof path === "string" && path.startsWith("/") && !path.startsWith("//")) listener(path);
    };
    ipcRenderer.on(IPC.navigate, handler);
    return () => ipcRenderer.removeListener(IPC.navigate, handler);
  },
};
contextBridge.exposeInMainWorld("naazhiDesktop", api);

const mark = () => {
  document.documentElement.dataset.desktop = boot.platform;
  document.documentElement.style.setProperty("--desktop-inset-left", `${boot.insetLeft}px`);
};
if (document.documentElement) mark();
document.addEventListener("DOMContentLoaded", mark, { once: true });
