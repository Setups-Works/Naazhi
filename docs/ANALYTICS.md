# Analytics (Firebase / Google Analytics 4 and Microsoft Clarity)

Two tools, one switch, one set of call sites. **Always call `track()`, `identify()`, `trackPage()` / `trackScreen()` from the analytics module** (`lib/analytics` on web and desktop, `features/analytics` on the phone): each one feeds Firebase **and** Clarity. Never import `@microsoft/clarity`, `@microsoft/react-native-clarity` or Firebase anywhere else.

## Microsoft Clarity (heatmaps, session recordings)

- **Where it runs:** web, the desktop app (it shows the same web app, so nothing extra) and the phone app. Signed-in app only, never the public pages.
- **Off until configured:** web and desktop need `NEXT_PUBLIC_CLARITY_PROJECT_ID` (the "Naazhi" web project, `ze3uk8zta4`), the phone needs `EXPO_PUBLIC_CLARITY_PROJECT_ID` (its own project, `ze3vbp8wbi`). In production both are set as GitHub repository variables, `CLARITY_PROJECT_ID` (baked into the web image by `deploy-azure-docker.yml`; an Azure app setting alone would not reach the browser) and `EXPO_PUBLIC_CLARITY_PROJECT_ID` (used by `release-android.yml`). Both are public ids; keeping web and phone in separate projects keeps their recordings apart. The phone also needs a **new native build** (not Expo Go).
- **Privacy:** the dashboard root has `data-clarity-mask="True"`, so no text people write is recorded on web or desktop. On the phone set Clarity → Settings → Masking to **Strict**. A new screen that shows content needs no extra work on web (it sits inside the dashboard root); if you add UI outside `app/dashboard`, add `data-clarity-mask="True"` to it.
- **Per person switch:** the same "Share anonymous usage" setting. Off stops recording at once (`consent(false)` on web, `pause()` on the phone).
- **Code:** web `apps/web/src/lib/analytics/clarity.ts`; phone `apps/mobile/src/features/analytics/clarity.ts`. Tags set: `plan`, `platform` (`web`, `desktop`, `app`). Custom events are the `track()` names.
- **Policies:** the Privacy Policy and Cookies pages name Clarity. If you add another tracking tool, update `app/privacy/page.tsx`, `app/cookies/page.tsx` and bump `LEGAL_UPDATED_ISO` in `lib/legal.ts` in the same PR.

## Firebase / Google Analytics 4

Firebase project `naazhi-bd05d`. The Firebase console menu maps to code like this:

| Console page | What feeds it |
| --- | --- |
| Dashboard, Realtime, Events | `track()` and automatic page/screen views |
| Events config | Mark events as conversions in the console (`select_plan`, `top_up`) |
| Audiences, Custom definitions | User property `plan` (register it as a custom dimension), `user_id` |
| Latest release | App version, collected by the mobile SDK |
| DebugView | Web: add the Chrome "Google Analytics Debugger" extension. Android: `adb shell setprop debug.firebase.analytics.app com.setupsworks.naazhi` |

## Rules

- **Only inside the signed-in app**, never the public marketing pages (so `/cookies` stays true for them).
- **Never send content**: no note, journal, chat or file text, names or emails, in any event or property. Paths have ids replaced with `:id`.
- **Per person switch**: Settings → General → Privacy → "Share anonymous usage" (`prefs.analytics`, default on; web and phone share it).
- **Off until configured**: web needs the `NEXT_PUBLIC_FIREBASE_*` values (public by design; see `.env.example`); set them in Azure app settings for production. The phone needs `apps/mobile/google-services.json` (Android) and `GoogleService-Info.plist` (iOS; without it iOS builds leave analytics out).

## Code

- Web: `apps/web/src/lib/analytics/index.ts` (`track`, `identify`, `trackPage`), `components/app/AnalyticsProvider.tsx` (in the dashboard layout).
- Phone: `apps/mobile/src/features/analytics/` (`track`, `identify`, `trackScreen`, `useAnalyticsSync`), `@react-native-firebase/app` plugin wired in `app.config.js`. Needs a new native build (not Expo Go).
- Events today: `page_view`/screen views, `select_plan`, `top_up` (web), `task_created` (web), `ai_note_action` (web). Add more with `track("snake_case_name", { small: "values" })`.

## Where people come from (our own database, no third party)

Share a **tracked link** and Admin → Analytics shows which source brought visits and sign-ups. Build the link in Admin → Analytics → **Make a tracked link**.

- **Website:** `https://naazhi.app/?utm_source=instagram&utm_medium=social&utm_campaign=launch` (`ref=` and `source=` work too). With no tags, the referring site is named instead (l.instagram.com becomes `instagram`, google.* becomes `google`, organic).
- **Google Play:** `…details?id=com.setupsworks.naazhi&referrer=utm_source%3Dinstagram%26utm_medium%3Dsocial`. After install the app reads the Play install referrer (`expo-application`) on the first launch. Needs a build that includes `useAcquisitionSync`; without a referrer Play reports `google-play / organic`.
- **How it is kept:** `AttributionCapture` (root layout) remembers the source in a 30-day first-party cookie `nz_src` (four short words, nothing else; a tagged link replaces an older source) and counts one anonymous **visit** per browser session (`POST /api/v1/visits`: cleaned source tags, referring host, path; no address, device or id; bots, the app and admin pages are skipped). `AcquisitionSync` (dashboard and onboarding layouts) calls `POST /api/v1/acquisition` once after sign-in, and the server notes the source with the person (`user_acquisition`). The first answer is kept.
- **Read in:** Admin → Analytics (visits by source, landing pages, visits to sign-ups, sources, campaigns) and Admin → Users (Came from). People who signed up before this was added show "Not tracked".
- **Code:** `packages/logic/src/acquisition.ts` (one parser for the site, the server and the app, with tests), `server/services/acquisition/*`, `components/site/AttributionCapture.tsx`, `components/app/AcquisitionSync.tsx`, `components/admin/TrackedLinkBuilder.tsx`, `apps/mobile/src/features/acquisition`.
- Production migrations are manual: apply `20261113150000` and `20261113160000` before the new web code is live.
