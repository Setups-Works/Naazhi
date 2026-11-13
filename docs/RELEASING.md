# Releasing the Android app

A version tag builds the app and publishes the APK as a GitHub Release. Nothing is built or uploaded by hand. The same tag also builds the Mac and Windows apps (`release-desktop.yml`, see [DESKTOP.md](DESKTOP.md)) and attaches them to that release.

```bash
git checkout main && git pull
git tag -a v1.2.0 -m "v1.2.0: what changed"
git push origin v1.2.0
gh run watch                       # follow the "Release Android" workflow
gh release view v1.2.0             # the APK and its .sha256 are attached
```

Re-run an existing tag (for example after changing a repository setting): Actions → **Release Android** → Run workflow → enter the tag, or `gh workflow run release-android.yml -f tag=v1.2.0`.

Tags must look like `v1.2.3`. A tag with a suffix (`v1.2.3-beta.1`) is published as a pre-release.

## How people get the update

Android people get updates from **Google Play**. A tag push uploads the `.aab` to Play by itself when the secret `PLAY_SERVICE_ACCOUNT_JSON` and the release keystore secrets are set (see "Uploading to Google Play automatically" below); otherwise upload the `.aab` from the GitHub Release to a Play track by hand; the app then uses Play in-app updates (`apps/mobile/src/features/updates`): on launch and when it returns to the foreground it asks Play, and if a newer version is published on the person's track it starts an **immediate, mandatory update** behind a full-screen "Update required" screen. **Settings → About and updates → Check for updates** asks on demand. Play only answers for builds installed from Play, so a sideloaded APK is never blocked and is never updated in-app: install a new APK by hand. The app does not download or install APKs itself and must not request `REQUEST_INSTALL_PACKAGES` (Google Play rejects it). `versionCode` rises with each run, which Play requires for every upload.

**An AI agent doing a release follows [RELEASE_FOR_AGENTS.md](RELEASE_FOR_AGENTS.md)** (version files, changelog, migrations, push, tag).

Add a line to the web changelog (`apps/web/src/features/changelog/releases.ts`) in the same change as the tag.

## What the workflow does (`.github/workflows/release-android.yml`)

1. Generates `apps/mobile/android` with `expo prebuild` (that folder is never committed).
2. Sets `versionName` from the tag and `versionCode` from the run number, so a newer APK always installs over an older one.
3. Builds `assembleRelease`, signs it, names it `naazhi-<tag>.apk` and writes a SHA-256 file.
4. Creates (or updates) the release for the tag with auto-generated notes.

## Settings (repository → Settings → Secrets and variables → Actions)

| Name                                                                                                | Kind     | Purpose                                                                  |
| --------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| `EXPO_PUBLIC_API_URL`                                                                               | variable | The web app's address, compiled into the app. Required.                  |
| `EXPO_PUBLIC_SITE_URL`                                                                              | variable | The public website (for the changelog and privacy links). Optional.      |
| `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | secrets  | Optional release key. Without them the APK is signed with the debug key. |

A debug-signed APK installs on any phone (allow installs from the browser or Files app) but cannot be uploaded to Google Play. To sign properly, create a keystore once and store it as secrets:

```bash
keytool -genkeypair -v -keystore release.keystore -alias untitled -keyalg RSA -keysize 2048 -validity 10000
base64 -i release.keystore | gh secret set ANDROID_KEYSTORE_BASE64
gh secret set ANDROID_KEYSTORE_PASSWORD
gh secret set ANDROID_KEY_ALIAS --body untitled
gh secret set ANDROID_KEY_PASSWORD
```

Keep `release.keystore` somewhere safe and never commit it: every future update must be signed with the same key.

## Uploading to Google Play automatically

The last steps of `release-android.yml` upload the signed `.aab` to Google Play on every tag push (a manual re-run of an old tag never uploads). Stable tags (`v2.1.0`) go to the `production` track; a pre-release tag (`v2.1.0-rc.1`) always goes to `internal` testing. The step is skipped, with a notice in the run, when the secret is missing or the bundle is debug-signed, and a failed upload does not fail the run (the GitHub Release still goes out): read the step's annotation for Play's reason.

One-time setup:

1. In Google Cloud, create a service account (any project) and download a **JSON key** for it. Enable the **Google Play Android Developer API** on that project.
2. In Play Console → **Users and permissions → Invite new users**, add the service account's email and give it release permission for the Naazhi app (at least "Release to production, exclude devices, and use Play App Signing", or the testing-track permission if you only use `internal`).
3. In GitHub → Settings → Secrets and variables → Actions, add the secret `PLAY_SERVICE_ACCOUNT_JSON` (paste the whole JSON). The `ANDROID_KEYSTORE_*` and `ANDROID_KEY_*` secrets (your **upload** key) must be set too.
4. Optional repository variables: `PLAY_TRACK` (`production` default, or `internal` / `closed` / `open`) and `PLAY_STATUS` (`completed` rolls out at once; `draft` only uploads and you press **Release** in Play Console).

A brand-new app that has never been published must be released once from Play Console first (store listing, content rating, data safety), and until then set `PLAY_STATUS=draft`. Google's review still applies to a production release.
