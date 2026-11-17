# services/composio

**Owner:** track C. **Phase 3.**

**Built:** Gmail, Google Calendar and Google Drive for every person with **one Google sign-in** (our own OAuth, no third-party broker; the folder keeps the name `composio` from when it used Composio). Connect and disconnect in Settings → Google (one button for all), chat cards (`<show-item>{"kind":"composio"}`), and the `gmail_send` / `gcal_event` drafts that act only after the person presses the button.

## How it works

- **One OAuth client.** `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (the same client as Google sign-in). Redirect URI: `<BETTER_AUTH_URL>/api/v1/integrations/composio/callback`. Scopes (per app, `lib/composio/apps.ts`): `gmail.readonly`, `gmail.send`, `calendar.events`, `drive.readonly`. Gmail and Drive scopes are *restricted*: Google verifies the app (and may require a security assessment) before anyone outside the test users can connect.
- **Tokens are ours, sealed.** One row per person in `user_integrations` (provider `google`): refresh and access tokens sealed with `keyVault` and the user id, the account's email as label, `services` = the apps Google granted (a person may untick some on the approval page). `state` lives in `integration_oauth_states` as a hash, single use, ten minutes.

## Files

| File | Does |
| --- | --- |
| `index.ts` | The public API. Everything outside this folder imports from here only. |
| `google.ts` | The OAuth flow: start, finish (code → tokens), revoke, and `accessToken` (refresh shared per person). The only file that reads the client id and secret. |
| `api.ts` | `googleApi(userId, app, url, init)`: one call as that person; refuses an app they didn't connect, rate-limits, forgets the connection on 401. |
| `connections.ts` | Status and the connect / disconnect entry points. |
| `readers.ts` | The rows a chat card shows, per app (Gmail, Calendar, Drive). |
| `drafts.ts` | `sendGmail`, `createCalendarEvent`: what a confirmed chat draft does. Every field is checked again; header values cannot hold line breaks. |
| `json.ts` | Safe readers for what Google answers. |

## Rules

- Routes, the chat service and jobs call `index.ts`; the browser calls `/api/v1/integrations/composio/*` (a name kept from before).
- Every call uses the signed-in person's user id and their own sealed token, never an id or token from the request.
- Never log tokens, codes, the client secret, or the content of mail, events or files. Log error names and statuses only.
- Writes (send, create) run only from a draft the person confirmed (`services/ai/actions.ts`).
- Add an app: its id in `@untitled/types` and `packages/validation/src/composioActions.ts`, its entry (with scopes) in `lib/composio/apps.ts`, and its reader in `readers.ts`. No migration.

**Tests:** `apps/web/tests/unit/composio.test.ts` (no database, no network: Google's API is faked).
