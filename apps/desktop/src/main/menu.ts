import { app, Menu, shell, type MenuItemConstructorOptions } from "electron";
import { DESKTOP_SECTIONS } from "@untitled/types";
import { config, platform } from "./config";
import { goTo } from "./navigation";
import { checkForUpdates } from "./updater";
import { mainWindow, showMainWindow } from "./window";

const go = (path: string) => () => goTo(showMainWindow(), path);

/** The sections people jump between (shared with the web app and deep links), with ⌘1…⌘9 / Ctrl+1…9. */
export const sectionItems = (): MenuItemConstructorOptions[] =>
  DESKTOP_SECTIONS.filter((s) => s.id !== "settings").map((s, i) => ({ label: s.label, accelerator: `CmdOrCtrl+${i + 1}`, click: go(s.path) }));

const settings = DESKTOP_SECTIONS.find((s) => s.id === "settings")!;

export function buildMenu(): void {
  const mac = platform === "mac";
  const template: MenuItemConstructorOptions[] = [
    ...(mac
      ? [
          {
            label: config.productName,
            submenu: [
              { role: "about" },
              { label: "Check for updates…", click: checkForUpdates },
              { type: "separator" },
              { label: "Settings…", accelerator: "Cmd+,", click: go(settings.path) },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          } satisfies MenuItemConstructorOptions,
        ]
      : [
          {
            label: "File",
            submenu: [
              { label: "Settings", accelerator: "Ctrl+,", click: go(settings.path) },
              { type: "separator" },
              { role: "quit" },
            ],
          } satisfies MenuItemConstructorOptions,
        ]),
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "pasteAndMatchStyle" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(config.dev ? ([{ type: "separator" }, { role: "toggleDevTools" }] satisfies MenuItemConstructorOptions[]) : []),
      ],
    },
    { label: "Go", submenu: [{ label: "Back", accelerator: mac ? "Cmd+[" : "Alt+Left", click: () => mainWindow()?.webContents.navigationHistory.goBack() }, { label: "Forward", accelerator: mac ? "Cmd+]" : "Alt+Right", click: () => mainWindow()?.webContents.navigationHistory.goForward() }, { type: "separator" }, ...sectionItems()] },
    { label: "Window", submenu: mac ? [{ role: "minimize" }, { role: "zoom" }, { type: "separator" }, { role: "front" }] : [{ role: "minimize" }, { role: "close" }] },
    {
      role: "help",
      submenu: [
        { label: "Open in browser", click: () => void shell.openExternal(mainWindow()?.webContents.getURL().startsWith(config.appOrigin) ? mainWindow()!.webContents.getURL() : config.appUrl) },
        ...(mac ? [] : ([{ label: "Check for updates…", click: checkForUpdates }, { type: "separator" }, { label: `About ${config.productName} ${app.getVersion()}`, click: () => app.showAboutPanel() }] satisfies MenuItemConstructorOptions[])),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
