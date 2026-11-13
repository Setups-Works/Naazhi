import { app, dialog } from "electron";
import { autoUpdater } from "electron-updater";
import { config } from "./config";
import { mainWindow } from "./window";

/**
 * The web app updates itself (the window shows the hosted site), so this only covers the shell: native changes are rare.
 * Updates come from the GitHub Release that the release workflow publishes (latest.yml / latest-mac.yml). A pre-release is never offered.
 * macOS only installs updates for a signed and notarized build; an unsigned build fails quietly here and is updated by downloading again.
 */
let manual = false;

export function setupUpdater(): void {
  if (config.dev) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on("update-downloaded", async (info) => {
    const win = mainWindow();
    const options = {
      type: "info" as const,
      message: `Naazhi ${info.version} is ready.`,
      detail: "Restart to finish updating. Your work is saved as you go.",
      buttons: ["Restart now", "Later"],
      defaultId: 0,
      cancelId: 1,
    };
    const { response } = win ? await dialog.showMessageBox(win, options) : await dialog.showMessageBox(options);
    if (response === 0) autoUpdater.quitAndInstall();
  });
  autoUpdater.on("update-not-available", () => {
    if (!manual) return;
    manual = false;
    void dialog.showMessageBox({ type: "info", message: "You’re up to date.", detail: `Naazhi ${app.getVersion()} is the newest version.` });
  });
  autoUpdater.on("error", () => {
    if (!manual) return;
    manual = false;
    void dialog.showMessageBox({ type: "info", message: "Couldn’t check for updates.", detail: "Try again in a moment." });
  });

  void autoUpdater.checkForUpdates().catch(() => undefined);
  // The shell can stay open for days; look again every few hours.
  setInterval(() => void autoUpdater.checkForUpdates().catch(() => undefined), 6 * 60 * 60 * 1000).unref();
}

export function checkForUpdates(): void {
  if (config.dev) {
    void dialog.showMessageBox({ type: "info", message: "Updates are off in development." });
    return;
  }
  manual = true;
  void autoUpdater.checkForUpdates().catch(() => {
    manual = false;
  });
}
