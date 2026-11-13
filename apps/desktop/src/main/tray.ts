import path from "node:path";
import { app, Menu, nativeImage, nativeTheme, Tray } from "electron";
import { config, platform } from "./config";
import { sectionItems } from "./menu";
import { checkForUpdates } from "./updater";
import { showMainWindow } from "./window";

/**
 * The menu-bar (macOS) / notification-area (Windows) icon: a way back to the window and to the main sections without opening it first.
 * The mark is drawn from the brand files in dist/assets. macOS wants a one-colour "template" image that it tints itself; on Windows the
 * cream mark is used on a dark taskbar and the ink mark on a light one.
 */
let tray: Tray | null = null;

const ICON_SIZE = 18;

function icon() {
  const file = platform === "win" && nativeTheme.shouldUseDarkColors ? "mark-light.png" : "mark.png";
  const image = nativeImage.createFromPath(path.join(config.assets, file)).resize({ height: ICON_SIZE });
  if (platform === "mac") image.setTemplateImage(true);
  return image;
}

export function setupTray(): void {
  if (platform === "linux") return;
  tray = new Tray(icon());
  tray.setToolTip(config.productName);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `Open ${config.productName}`, click: () => showMainWindow() },
      { type: "separator" },
      ...sectionItems(),
      { type: "separator" },
      { label: "Check for updates…", click: checkForUpdates },
      { label: "Quit", click: () => app.quit() },
    ]),
  );
  // Windows: a click on the icon opens the window (the menu is on right-click). macOS shows the menu on click.
  if (platform === "win") tray.on("click", () => showMainWindow());
  nativeTheme.on("updated", () => tray?.setImage(icon()));
}
