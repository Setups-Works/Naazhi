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
