# apps/desktop — the Mac and Windows app

**Read `docs/DESKTOP.md` first.** An Electron shell around the hosted web app: window frame, menus, tray, deep links, browser sign-in, updates. No product UI lives here; build features in `apps/web` and they appear in the desktop app.

## Layout

```
src/main/      the main process: window, chrome (title bar), menu, tray, deepLink, auth, updater, navigation, windowState, config
src/preload/   exposes window.naazhiDesktop to the page (isolated world); sets <html data-desktop>
src/shared/    ipc.ts — the message names, so main and preload can't drift
assets/        offline page (system colours only: it is outside the app's theme)
resources/     macOS entitlements
scripts/       build.mjs (esbuild + app-config.json), start.mjs (dev)
electron-builder.config.mjs   installers, update feed, signing (all from the environment)
```

## Rules

- **No hard-coding.** The app address is `DESKTOP_APP_URL` at build time (`config.ts` reads `dist/app-config.json`); name, scheme and app id are `packages/types/src/desktop.json`; colours come from the page (`DesktopBridge`), never from here. No URLs, hex colours or version numbers in source.
- **Security:** `contextIsolation` and `sandbox` stay on, no Node in the page. The page is untrusted input: every IPC message is validated (`cleanChrome`, deep-link path and token checks) and only accepted from the app's own origin (`fromApp`). Links outside the app's origin open in the browser. Permissions are an allow-list (`index.ts`). Never add a secret here: the shell is distributed to everyone.
- The contract with the web (`NaazhiDesktopApi`, sections, deep links) is in `packages/types/src/desktop.ts`; change both sides together.
- The version is the repo's version (kept equal by `apps/web/tests/unit/version-sync.test.ts`); a release tag decides what installers say.
- Don't build packages while the user's web dev server is running if both write to the same folder (they don't: this writes `apps/desktop/dist` and `release`, both ignored).

## Checks

`corepack pnpm --filter desktop typecheck`, `corepack pnpm --filter desktop build`, and for packaging `corepack pnpm --filter desktop exec electron-builder --config electron-builder.config.mjs --mac dir -c.mac.identity=null --publish never`.
