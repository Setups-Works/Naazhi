# Analytics (Firebase / Google Analytics 4)

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
