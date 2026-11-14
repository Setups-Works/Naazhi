# Desktop app (Mac and Windows)

`apps/desktop` is an Electron shell: a native window around the hosted web app. It opens the app host (`https://dashboard.naazhi.app`, from the build variable `DESKTOP_APP_URL`) at `/dashboard`, so signed-out people land on sign-in and signed-in people on Home. **There is no second UI.** A feature built for the web reaches the desktop app on its next launch, with no new installer; a new desktop release is only needed when the shell itself changes.

## What the shell adds

| Area            | What it does                                                                                                                                              | Where                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Window frame    | No system title bar: the web app's top bar runs to the edge, with the macOS traffic lights / Windows caption buttons over it. Size and position are remembered. | `src/main/window.ts`, `chrome.ts`, `windowState.ts`  |
| Theme           | The page reports its resolved `--page` / `--fg` colours and top-bar height; the shell paints the frame with them. No colour is written in the shell.      | `DesktopBridge.tsx` (web) → `chrome.ts`               |
| Menus, tray     | Native menus, ⌘/Ctrl+1…6 jump between sections, ⌘/Ctrl+, opens Settings, menu-bar / tray icon with the same shortcuts.                                    | `menu.ts`, `tray.ts`                                  |
| Deep links      | `naazhi://notes/<id>`, `naazhi://todo`… open that page; one running copy only (a second launch hands its link to the first).                              | `deepLink.ts`, `packages/types/src/desktop.ts`        |
| Notifications   | To-dos with a reminder time and new inbox messages (such as a shared-journal invitation) show as system notifications; a click opens the page. Reminders are held by the shell, so one fires with the window closed on macOS; on Windows the app must be running (minimise it, don't quit). Only reminders still in the future are shown. | `reminders.ts`, `components/app/DesktopBridge.tsx`, `packages/types/src/desktop.ts` |
| Google sign-in  | Google refuses sign-in in an embedded window. The login page shows a six-character code and the shell opens the browser at `/desktop-signin?code=…`; the person presses Authorize there and the page collects a single-use token by polling `/api/v1/desktop-auth`. Older shells (no code) still use a token over `naazhi://auth`. | `auth.ts`, `app/desktop-signin`, `components/auth/DesktopCodeSignIn.tsx`, `server/services/desktopSignIn` |
| Offline         | A plain "You're offline" page that retries when the network returns (the real offline mode is a later phase: it needs a local store and sync).            | `assets/offline.html`                                 |
| Updates         | `electron-updater` reads the GitHub Release (`latest.yml`, `latest-mac.yml`). Pre-releases are never offered.                                              | `updater.ts`                                          |

Email and password and passkeys sign in inside the window as usual.

## How the web app knows it is in the desktop app

The preload script sets `<html data-desktop="mac|win|linux">` and `--desktop-inset-left`, and exposes `window.naazhiDesktop` (typed in `packages/types/src/desktop.ts`). The desktop CSS lives in the last block of `globals.css`; the top bar's height is the token `--bar-h`. Everything is inert in a normal browser. The user agent also carries `NaazhiDesktop/<version>`, so Settings → sessions shows "Desktop app on macOS".

When you add a feature, **don't branch on desktop** unless the window frame forces it. If a new fixed header sits at the top of the window, make it a drag region the way `.ap-top` is (`-webkit-app-region: drag`, with `no-drag` on its buttons).

## Develop

```bash
corepack pnpm dev:web          # the web app on http://localhost:3000
corepack pnpm dev:desktop      # builds the shell and opens it against that address (DESKTOP_APP_URL to use another)
corepack pnpm --filter desktop typecheck
```

On macOS a development run does not register `naazhi://` with the system reliably; test deep links from an installed build.

## Identity values: one place

`packages/types/src/desktop.json` holds the app id, product name and URL scheme. The installer config, the shell and the web app all read it. The app address comes from `DESKTOP_APP_URL` at build time (never in code); colours come from the page; artwork from the brand files (`scripts/brand/build-assets.mjs`).

## Release (`.github/workflows/release-desktop.yml`)

The same `v*` tag that builds Android builds the Mac (universal `.dmg` + `.zip`) and Windows (`.exe`, x64 and arm64) apps and adds them, with `latest*.yml`, block maps and a `.sha256`, to the **same GitHub Release**. Run it by hand for an existing tag: Actions → Release Desktop → Run workflow, or `gh workflow run release-desktop.yml -f tag=v1.2.0`. The version in the installer comes from the tag.

Settings (repository → Settings → Secrets and variables → Actions):

| Name                                                                                    | Kind     | Purpose                                                                                           |
| --------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `DESKTOP_APP_URL`                                                                       | variable | `https://dashboard.naazhi.app`. Required; falls back to `EXPO_PUBLIC_API_URL` (the same address). |
| `MAC_CERTIFICATE_BASE64`, `MAC_CERTIFICATE_PASSWORD`                                    | secrets  | Developer ID Application certificate (.p12). Without it the Mac app is unsigned and won't auto-update. |
| `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`                              | secrets  | Notarization.                                                                                     |
| `WIN_CERTIFICATE_BASE64`, `WIN_CERTIFICATE_PASSWORD`                                    | secrets  | Windows code-signing certificate (.pfx)…                                                          |
| `AZURE_SIGNING_ENDPOINT/ACCOUNT/PROFILE/PUBLISHER` (variables), `AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET` (secrets) | both | …or Azure Trusted Signing instead. Without either, SmartScreen warns on first run. |

```bash
gh variable set DESKTOP_APP_URL --body https://dashboard.naazhi.app
base64 -i DeveloperID.p12 | gh secret set MAC_CERTIFICATE_BASE64
```

Unsigned builds work for trying it out; to ship to people, set the Mac and Windows signing settings first.

## Limits to know

- Links that leave the app's own address open in the person's browser. A connection flow that redirects through another site (for example connecting Zoho) therefore finishes in the browser, not in the window: check each such flow before announcing the desktop app.
- The window needs the network. Offline notes and tasks are a later phase.
- Mac App Store and Microsoft Store are not targeted (a shell that loads a remote site doesn't suit store review); people download from the GitHub Release.
