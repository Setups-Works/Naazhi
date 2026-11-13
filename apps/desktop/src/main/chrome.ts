import type { BrowserWindow } from "electron";
import type { DesktopChrome } from "@untitled/types";
import { platform } from "./config";
import { saveState } from "./windowState";

/**
 * The window's own frame. The system title bar is hidden so the web app's top bar runs to the window's edge, with the macOS traffic lights
 * and the Windows caption buttons drawn over it. The page reports its colours and top-bar height (see DesktopBridge in the web app), so the
 * frame follows the person's theme and accent without any colour being written down here.
 */
export const MIN_SIZE = { width: 480, height: 600 } as const;
export const DEFAULT_SIZE = { width: 1280, height: 820 } as const;

/** Until the page reports its real top-bar height (the web app's `.ap-top`). */
export const FALLBACK_BAR_HEIGHT = 48;

/** macOS draws three 12-pt buttons with 8-pt gaps; this is their footprint plus a little breathing room. */
const LIGHTS_X = 16;
const LIGHTS_SIZE = 14;
export const LIGHTS_FOOTPRINT = LIGHTS_X + 56;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Where the traffic lights sit so they are centred in a top bar of this height. */
export const lightsPosition = (barHeight: number) => ({ x: LIGHTS_X, y: Math.round((barHeight - LIGHTS_SIZE) / 2) });

/** The page's input is untrusted: accept only short colour strings and a sane height. */
export function cleanChrome(input: unknown): DesktopChrome | null {
  if (!input || typeof input !== "object") return null;
  const { background, foreground, barHeight } = input as Record<string, unknown>;
  if (typeof background !== "string" || typeof foreground !== "string" || typeof barHeight !== "number") return null;
  if (background.length > 64 || foreground.length > 64 || !Number.isFinite(barHeight)) return null;
  return { background, foreground, barHeight: clamp(Math.round(barHeight), 24, 96) };
}

export function applyChrome(win: BrowserWindow, chrome: DesktopChrome): void {
  if (win.isDestroyed()) return;
  win.setBackgroundColor(chrome.background);
  if (platform === "win") win.setTitleBarOverlay({ color: chrome.background, symbolColor: chrome.foreground, height: chrome.barHeight });
  if (platform === "mac") win.setWindowButtonPosition(lightsPosition(chrome.barHeight));
  saveState({ chrome });
}
