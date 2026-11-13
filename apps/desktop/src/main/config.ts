import { readFileSync } from "node:fs";
import path from "node:path";
import { app } from "electron";
import { DESKTOP } from "@untitled/types";

/**
 * What the build baked in (scripts/build.mjs writes dist/app-config.json): the address of the hosted web app. The shell shows that site,
 * so web releases reach the desktop without a new installer. Identity values (name, URL scheme) come from packages/types/src/desktop.json.
 */
type BuildConfig = { appUrl: string };

const build = JSON.parse(readFileSync(path.join(__dirname, "app-config.json"), "utf8")) as BuildConfig;

export const config = {
  appUrl: build.appUrl.replace(/\/+$/, ""),
  appOrigin: new URL(build.appUrl).origin,
  /** Where the window opens: the signed-in app, not the website. Signed out, the web app sends the person to sign-in and back; on the
   *  app host (dashboard.naazhi.app) /dashboard lands on /home. */
  startUrl: `${build.appUrl.replace(/\/+$/, "")}/dashboard`,
  scheme: DESKTOP.scheme,
  productName: DESKTOP.productName,
  version: app.getVersion(),
  /** True when run from `pnpm --filter desktop start` rather than from an installed app. */
  dev: !app.isPackaged,
  assets: path.join(__dirname, "assets"),
} as const;

/** True for an address inside the hosted app. Everything else opens in the person's browser. */
export const isAppUrl = (url: string): boolean => {
  try {
    return new URL(url).origin === config.appOrigin;
  } catch {
    return false;
  }
};

export const platform = process.platform === "darwin" ? "mac" : process.platform === "win32" ? "win" : "linux";
