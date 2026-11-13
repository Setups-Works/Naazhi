import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { app, screen, type BrowserWindow, type Rectangle } from "electron";
import type { DesktopChrome } from "@untitled/types";

/** What is remembered between launches: where the window was, and the colours the page last reported (so the first paint isn't a white flash). */
type Saved = { bounds?: Rectangle; maximized?: boolean; chrome?: DesktopChrome };

const file = () => path.join(app.getPath("userData"), "window-state.json");

export function loadState(): Saved {
  try {
    const saved = JSON.parse(readFileSync(file(), "utf8")) as Saved;
    // A monitor may have been unplugged since: only reuse the position when it is still on a screen.
    if (saved.bounds && !screen.getAllDisplays().some((d) => rectsOverlap(d.workArea, saved.bounds!))) delete saved.bounds;
    return saved;
  } catch {
    return {};
  }
}

const rectsOverlap = (a: Rectangle, b: Rectangle) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

export function saveState(patch: Partial<Saved>): void {
  try {
    writeFileSync(file(), JSON.stringify({ ...loadState(), ...patch }));
  } catch {
    // Remembering the window is a convenience; never fail because of it.
  }
}

/** Saves the window's size and position when it moves, resizes or closes. */
export function trackWindow(win: BrowserWindow): void {
  let timer: NodeJS.Timeout | undefined;
  const save = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return;
      saveState({ maximized: win.isMaximized(), ...(win.isMaximized() ? {} : { bounds: win.getBounds() }) });
    }, 400);
  };
  win.on("resize", save);
  win.on("move", save);
  win.on("close", () => {
    clearTimeout(timer);
    if (!win.isMinimized() && !win.isFullScreen()) saveState({ maximized: win.isMaximized(), ...(win.isMaximized() ? {} : { bounds: win.getBounds() }) });
  });
}
