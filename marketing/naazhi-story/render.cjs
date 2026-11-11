// Renders index.html to a 1080×1920 PNG (Instagram story). Needs Google Chrome or CHROME_PATH.
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");
const { chromium } = require("../../apps/web/node_modules/@playwright/test");
const chromePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
(async () => {
  const browser = await chromium.launch({ headless: true, ...(fs.existsSync(chromePath) ? { executablePath: chromePath } : {}), args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.join(__dirname, process.argv[2] || "index.html")).href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(__dirname, process.argv[3] || "naazhi-available-now-story.png") });
  await browser.close();
})();
