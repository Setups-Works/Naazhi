#!/usr/bin/env node
/**
 * Bundles the shell into dist/ (main process, preload, brand assets, and app-config.json with the address of the hosted web app).
 *
 *   node scripts/build.mjs             development build; the app address defaults to the local dev server
 *   node scripts/build.mjs --release   installer build; DESKTOP_APP_URL must be set (the web app's public address)
 *
 * No address or colour is written in the code: the address comes from the environment at build time, the identity values from
 * packages/types/src/desktop.json, and the artwork from the brand files.
 */
import { build } from "esbuild";
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const repo = path.resolve(root, "../..");
const release = process.argv.includes("--release");

const appUrl = process.env.DESKTOP_APP_URL?.trim() || (release ? "" : "http://localhost:3000");
if (!appUrl) {
  console.error("Set DESKTOP_APP_URL to the web app's public address (for example the repository variable DESKTOP_APP_URL) before an installer build.");
  process.exit(1);
}
try {
  new URL(appUrl);
} catch {
  console.error("DESKTOP_APP_URL is not a valid address.");
  process.exit(1);
}
if (release && !appUrl.startsWith("https://")) {
  console.error("An installer build must point at an https address.");
  process.exit(1);
}

const dist = path.join(root, "dist");
rmSync(dist, { recursive: true, force: true });
mkdirSync(path.join(dist, "assets"), { recursive: true });

const common = { bundle: true, platform: "node", format: "cjs", target: "node22", external: ["electron"], sourcemap: true, logLevel: "info" };
await build({ ...common, entryPoints: [path.join(root, "src/main/index.ts")], outfile: path.join(dist, "main.js") });
await build({ ...common, entryPoints: [path.join(root, "src/preload/index.ts")], outfile: path.join(dist, "preload.js") });

writeFileSync(path.join(dist, "app-config.json"), JSON.stringify({ appUrl }, null, 2));

// The tray mark and the offline page; the installer icon is the brand's app icon.
copyFileSync(path.join(repo, "apps/web/public/brand/naazhi-mark.png"), path.join(dist, "assets/mark.png"));
copyFileSync(path.join(repo, "apps/web/public/brand/naazhi-mark-light.png"), path.join(dist, "assets/mark-light.png"));
for (const file of ["offline.html", "offline.js"]) copyFileSync(path.join(root, "assets", file), path.join(dist, "assets", file));
mkdirSync(path.join(root, "build"), { recursive: true });
copyFileSync(path.join(repo, "brand/exports/naazhi-app-icon-1024.png"), path.join(root, "build/icon.png"));

console.log(`Desktop shell built for ${new URL(appUrl).origin}`);
