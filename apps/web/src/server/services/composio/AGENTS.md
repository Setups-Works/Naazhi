# services/composio

**Owner:** track C. **Phase 3.** **Jira:** UNT-70 (service), UNT-71 (page), UNT-82 (chat), UNT-94 (Slack/GitHub), UNT-96 (admin health).

**Built:** Gmail and Google Calendar for every person, through one Composio project key. Connect and disconnect in Settings → Google, chat cards (`<show-item>{"kind":"composio"}`), and the `gmail_send` / `gcal_event` drafts that act only after the person presses the button. Webhook events are verified and recorded (ids only); nothing acts on them yet.

## How it works

- **One key for everyone.** `COMPOSIO_API_KEY` belongs to the Naazhi project. Each person's connections live at Composio under their Naazhi user id, so people never have a key of their own.
- **One auth config per app** (`COMPOSIO_AUTH_CONFIG_<APP>`), created once in the Composio dashboard. An app without one shows as "not set up".
- **We store no tokens.** `integration_connections` keeps the Composio connection id, our state (`connected | pending | expired | error`) and the account label. Composio holds the OAuth tokens.

## Files

| File | Does |
| --- | --- |
| `index.ts` | The public API. Everything outside this folder imports from here only. |
| `client.ts` | The SDK client and its settings (key, auth configs, toolkit versions, webhook secret). The only file that reads `serverEnv().composio`. |
| `connections.ts` | Status, start a sign-in (`connectedAccounts.link`), finish it (`waitForConnection` + account label), disconnect. |
| `tools.ts` | `executeTool(userId, app, tool, args)`: runs one tool as that person with their own connection. Refuses another app's tools, rate-limits, marks a connection `expired` when the app stops accepting it. |
| `readers.ts` | The rows a chat card shows, per app. |
| `drafts.ts` | `sendGmail`, `createCalendarEvent`: what a confirmed chat draft does. Every field is checked again. |
| `webhook.ts` | Verifies Composio's signature (`triggers.parse`) and records each event once. |
| `errors.ts`, `json.ts` | SDK errors → typed errors a person can act on; safe readers for tool answers. |

Vocabulary (app names, views, logos) is in `apps/web/src/lib/composio/apps.ts`; the prompt part is `services/ai/prompts/composio.ts`.

## Rules

- Only this folder imports `@composio/core`. Routes, the chat service and jobs call `index.ts`; the browser calls `/api/v1/integrations/composio/*`.
- Every call names the signed-in person's user id **and** their own connection id from our table, never an id from the request.
- Never log tool arguments or answers (email and calendar content), tokens or the key. Log error names and statuses only.
- Writes (send, create) run only from a draft the person confirmed (`services/ai/actions.ts`).
- Add an app: its id in `@untitled/types` and `packages/validation/src/composioActions.ts`, its entry in `lib/composio/apps.ts`, its two env variables in `config/env.ts` and `.env.example`, and its reader in `readers.ts`. No migration.

**Tests:** `apps/web/tests/unit/composio.test.ts` (no database, no network: the repository and the SDK client are faked).
