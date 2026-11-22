import { existsSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

// 1. Turbo needs `pnpm` on PATH; Corepack's pnpm shim can be run without a global symlink.
const executable = process.env.npm_execpath;
if (executable) {
  const binDir = path.resolve("node_modules/.bin");
  if (!existsSync(binDir)) {
    try {
      mkdirSync(binDir, { recursive: true });
    } catch {
      // Ignore directory creation error if already handled
    }
  }

  const localShim = path.join(binDir, "pnpm");
  if (!existsSync(localShim)) {
    try {
      symlinkSync(executable, localShim, "file");
    } catch {
      // A global pnpm install remains usable when the filesystem disallows local symlinks.
    }
  }

  // On Windows, create .cmd and .ps1 wrappers so Turbo and child processes execute the local pnpm version
  if (process.platform === "win32") {
    const isExe = executable.endsWith(".exe");
    const cmdBody = isExe ? `@echo off\r\n"${executable}" %*\r\n` : `@echo off\r\nnode "${executable}" %*\r\n`;
    const ps1Body = isExe ? `& "${executable}" $args\r\n` : `& node "${executable}" $args\r\n`;
    const cmdShim = path.join(binDir, "pnpm.cmd");
    try {
      writeFileSync(cmdShim, cmdBody, "utf8");
    } catch {
      // Fall back gracefully
    }
    const ps1Shim = path.join(binDir, "pnpm.ps1");
    try {
      writeFileSync(ps1Shim, ps1Body, "utf8");
    } catch {
      // Fall back gracefully
    }
  }
}

// 2. Git hook configuration: cross-platform Node.js implementation
// Fails gracefully if Git is not installed, .git is absent, or running inside Docker
if (existsSync(".githooks")) {
  try {
    spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
      stdio: "ignore",
    });
  } catch {
    // Fail gracefully if git is unavailable in the environment
  }
}

// 3. On Windows, OneDrive and NTFS junction resolution issues cause workspace .bin shims
// for vitest (e.g. apps/web/node_modules/.bin/vitest.cmd) to fail when referencing `..\vitest\vitest.mjs`.
// Point them directly to the resolved virtual store entry in node_modules/.pnpm.
if (process.platform === "win32") {
  try {
    const pnpmStoreDir = path.resolve("node_modules/.pnpm");
    if (existsSync(pnpmStoreDir)) {
      const pnpmEntries = readdirSync(pnpmStoreDir);
      const vitestDirName = pnpmEntries.find((name) => name.startsWith("vitest@"));
      if (vitestDirName) {
        const workspaceBinDirs = [
          path.resolve("apps/web/node_modules/.bin"),
          path.resolve("packages/logic/node_modules/.bin"),
          path.resolve("packages/validation/node_modules/.bin"),
        ];

        for (const binDir of workspaceBinDirs) {
          const cmdPath = path.join(binDir, "vitest.cmd");
          const ps1Path = path.join(binDir, "vitest.ps1");

          const realVitestMjs = path.join(
            pnpmStoreDir,
            vitestDirName,
            "node_modules",
            "vitest",
            "vitest.mjs",
          );

          if (existsSync(cmdPath) && existsSync(realVitestMjs)) {
            let cmdContent = readFileSync(cmdPath, "utf8");
            if (cmdContent.includes('"%~dp0\\..\\vitest\\vitest.mjs"')) {
              const relPath = path.relative(binDir, realVitestMjs);
              const formattedRel = relPath.startsWith("..") ? `\\${relPath}` : `\\${relPath}`;
              cmdContent = cmdContent.replaceAll(
                '"%~dp0\\..\\vitest\\vitest.mjs"',
                `"%~dp0${formattedRel}"`,
              );
              writeFileSync(cmdPath, cmdContent, "utf8");
            }
          }

          if (existsSync(ps1Path) && existsSync(realVitestMjs)) {
            let ps1Content = readFileSync(ps1Path, "utf8");
            if (ps1Content.includes('"$basedir/../vitest/vitest.mjs"')) {
              const relPath = path.relative(binDir, realVitestMjs).replace(/\\/g, "/");
              const formattedRel = relPath.startsWith("..") ? `/${relPath}` : `/${relPath}`;
              ps1Content = ps1Content.replaceAll(
                '"$basedir/../vitest/vitest.mjs"',
                `"$basedir${formattedRel}"`,
              );
              writeFileSync(ps1Path, ps1Content, "utf8");
            }
          }
        }
      }
    }
  } catch {
    // Fall back gracefully
  }
}
