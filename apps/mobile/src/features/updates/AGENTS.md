# features/updates (app)

**Does:** keeps the Android app current through Google Play in-app updates (`expo-in-app-updates`, which wraps Play Core). The update is **mandatory**: when Play has a newer version, an immediate update starts and a full-screen "Update required" screen blocks the app until it is installed. iOS updates come from the store, so nothing is done there.

```
features/updates/
  UpdateProvider.tsx state machine (idle → checking → upToDate | required → updating | error) + useUpdate() for Settings
  UpdateRequired.tsx the blocking screen: no close button, back does nothing, "Update now" and "Open in Google Play"
```

**Rules**

- Checks on launch and whenever the app returns to the foreground; the automatic check never shows "up to date" or an error. Only the Settings button reports those.
- Play only answers for builds installed from Google Play. A sideloaded or debug build reports "up to date", so developers are never blocked.
- There is no GitHub download and no install permission: `android.permission.REQUEST_INSTALL_PACKAGES` must stay out of `app.json` (Google Play rejects it).
- Releases reach people only after the new bundle is published on the Play track they are on (see `docs/RELEASING.md`).
