import path from "node:path";
import { BrowserWindow, Menu, shell, type MenuItemConstructorOptions } from "electron";
import { DEFAULT_SIZE, FALLBACK_BAR_HEIGHT, lightsPosition, MIN_SIZE } from "./chrome";
import { config, isAppUrl, platform } from "./config";
import { watchBridge } from "./navigation";
import { loadState, trackWindow } from "./windowState";

let main: BrowserWindow | null = null;

export const mainWindow = () => (main && !main.isDestroyed() ? main : null);

/** Sends http(s) and mail links to the person's own browser or mail app; refuses everything else (file:, custom schemes). */
export function openExternally(url: string): void {
  try {
    const { protocol } = new URL(url);
    if (protocol === "https:" || protocol === "http:" || protocol === "mailto:") void shell.openExternal(url);
  } catch {
    // Not a URL: nothing to open.
  }
}

/**
 * A popup Razorpay's checkout opens for a payment step (bank or card verification). It starts blank or on a razorpay.com page and may then
 * move to the bank's own page inside that popup. It gets no preload and no Node access, like any web page.
 */
export function isPaymentPopup(url: string): boolean {
  if (url === "" || url === "about:blank") return true;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && (hostname === "razorpay.com" || hostname.endsWith(".razorpay.com"));
  } catch {
    return false;
  }
}

/** Shows the window (creating it if it was closed on macOS) and brings it to the front. */
export function showMainWindow(): BrowserWindow {
  const win = mainWindow() ?? createMainWindow();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
  return win;
}

export function createMainWindow(): BrowserWindow {
  const saved = loadState();
  const barHeight = saved.chrome?.barHeight ?? FALLBACK_BAR_HEIGHT;

  const win = new BrowserWindow({
    ...DEFAULT_SIZE,
    ...saved.bounds,
    minWidth: MIN_SIZE.width,
    minHeight: MIN_SIZE.height,
    show: false,
    title: config.productName,
    // The last colours the page reported, so the window never flashes white before the page paints.
    ...(saved.chrome ? { backgroundColor: saved.chrome.background } : {}),
    // No system title bar: the web app's top bar runs to the window's edge (see chrome.ts).
    titleBarStyle: platform === "linux" ? "default" : "hidden",
    ...(platform === "mac" ? { trafficLightPosition: lightsPosition(barHeight) } : {}),
    ...(platform === "win"
      ? {
          titleBarOverlay: {
            height: barHeight,
            ...(saved.chrome ? { color: saved.chrome.background, symbolColor: saved.chrome.foreground } : {}),
          },
        }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });
  main = win;
  trackWindow(win);
  watchBridge(win);
  if (saved.maximized) win.maximize();
  win.once("ready-to-show", () => win.show());
  win.on("closed", () => {
    if (main === win) main = null;
  });

  // Links the app opens: its own pages stay in this window, everything else goes to the browser. Razorpay's checkout is the exception:
  // card checks (3-D Secure) and net banking open in a popup that must stay tied to this page to report back, so it opens as a child.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isPaymentPopup(url))
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          parent: win,
          width: 520,
          height: 720,
          autoHideMenuBar: true,
          webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
        },
      };
    if (isAppUrl(url)) void win.loadURL(url);
    else openExternally(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (isAppUrl(url) || url.startsWith("file:")) return;
    event.preventDefault();
    openExternally(url);
  });

  // No connection: show the bundled "you're offline" page, which retries by itself when the network returns.
  win.webContents.on("did-fail-load", (_event, code, desc, url, isMainFrame) => {
    // -3 is a navigation that was cancelled on purpose (a redirect, a new load).
    if (!isMainFrame || code === -3 || url.startsWith("file:")) return;
    void win.loadFile(path.join(config.assets, "offline.html"), { query: { to: config.startUrl, code: String(code), reason: desc.slice(0, 60) } });
  });

  win.webContents.on("context-menu", (_event, params) => {
    const items: MenuItemConstructorOptions[] = [];
    if (params.misspelledWord) {
      items.push(
        ...params.dictionarySuggestions.map((s): MenuItemConstructorOptions => ({ label: s, click: () => win.webContents.replaceMisspelling(s) })),
        { type: "separator" },
      );
    }
    if (params.linkURL) items.push({ label: "Open link in browser", click: () => openExternally(params.linkURL) }, { type: "separator" });
    if (params.isEditable) items.push({ role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" });
    else if (params.selectionText) items.push({ role: "copy" });
    if (config.dev) items.push({ type: "separator" }, { role: "toggleDevTools" });
    if (items.length) Menu.buildFromTemplate(items).popup({ window: win });
  });

  void win.loadURL(config.startUrl);
  return win;
}
