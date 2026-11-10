# features/notifications (app)

**Does:** three kinds of notification, all on the phone, plus an inbox.

1. **Messages from the server** (an admin writing to users at `/admin/messages`, a shared-journal invitation, "new in your Reader"): saved in the `notifications` table (the inbox on the Notifications screen, with an unread dot on Home's bell) and, when push is set up, sent to the phone through Firebase.
2. **Reminders the phone plans itself** — to-dos due (8:00), a journal nudge with the streak (21:00) and events (15 minutes before). `packages/logic/src/reminders.ts` (`planReminders`, tested) decides what and when; `reminders.ts` reads the data and schedules local notifications. They are replanned whenever the app opens or returns to the foreground (at most every 10 minutes), so the text always names real tasks.
3. **Tapping** any of them opens the in-app path it carries (`data.url`).

**Files:** `constants.ts` (channels, hours, lead time, limits) · `prefs.ts` (per-account switches, kept on the phone) · `setup.ts` (foreground look, Android channels, permission) · `push.ts` (register/forget the phone: `POST /api/v1/notifications/devices`, `/devices/remove`) · `reminders.ts` · `useNotificationSync.ts` (mounted once in `app/_layout.tsx`) · `queries.ts` (inbox) · `NotificationsScreen.tsx` (route `app/notifications.tsx`).

**Server:** migration `20261110120000_notifications.sql` (RLS: people read, mark read and delete their own; only the server creates), `server/services/notifications` (`notifyUsers` writes the inbox row first, then pushes; `fcm.ts` talks to Firebase HTTP v1 with `FCM_SERVICE_ACCOUNT`), `/api/v1/notifications*`, and the hourly Reader check `/api/cron/reader-news` (called by `.github/workflows/cron-notifications.yml` with `CRON_SECRET`).

**Setting up push (Android):** create a Firebase project, add the Android app `com.setupsworks.naazhi`, then (a) put its `google-services.json` in the repository secret `GOOGLE_SERVICES_JSON_BASE64` (base64), (b) put a service-account key JSON in the web app's `FCM_SERVICE_ACCOUNT`, (c) set `APP_URL` and `CRON_SECRET` secrets for the hourly check. Without them the app builds and runs; messages show in the inbox and reminders still work, push is just off.

**Rules**

- Never put message text in `admin_audit` or logs. Notification `url`s must be in-app paths (the server rejects anything else).
- Turning the master switch off forgets the phone on the server and cancels the planned reminders; signing out does the same.
- Not verified on a physical phone yet: check a push from `/admin/messages`, a reminder, and a tap that opens the right screen.
