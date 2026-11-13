#!/usr/bin/env node
/**
 * Builds the shell and opens it against a running web app (default http://localhost:3000; set DESKTOP_APP_URL to use another).
 * Start the web app first: `corepack pnpm dev:web`.
 */
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const built = spawnSync(process.execPath, [path.join(root, "scripts/build.mjs")], { stdio: "inherit" });
if (built.status !== 0) process.exit(built.status ?? 1);

const electron = createRequire(import.meta.url)("electron");
const child = spawn(electron, [root, ...process.argv.slice(2)], { stdio: "inherit", env: { ...process.env, ELECTRON_ENABLE_LOGGING: "1" } });
child.on("exit", (code) => process.exit(code ?? 0));
