/*
 * Renders the "Version 8.0.1, what's new" Instagram story (1080 × 1920, 9:16) to out/naazhi-story-8-0-1.png. Run it with the desktop app's Electron:
 *   corepack pnpm --filter desktop exec electron ../../brand/social/whats-new-8-0-1/render.cjs
 */
const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

app.whenReady().then(async () => {
  fs.mkdirSync(path.join(__dirname, "out"), { recursive: true });
  const win = new BrowserWindow({ width: 1080, height: 1920, show: false, useContentSize: true, webPreferences: { backgroundThrottling: false } });
  await win.loadFile(path.join(__dirname, "whats-new.html"));
  await new Promise((r) => setTimeout(r, 900)); // fonts and the logos
  const image = await win.webContents.capturePage({ x: 0, y: 0, width: 1080, height: 1920 });
  fs.writeFileSync(path.join(__dirname, "out", "naazhi-story-8-0-1.png"), image.toPNG());
  win.destroy();
  app.quit();
}).catch((e) => {
  console.error(e);
  app.exit(1);
});
