# Zoho in Naazhi

One Zoho sign-in (Settings → Zoho) lets chat read and, after a button press, write in the Zoho services the person picks. Code: `apps/web/src/lib/zoho` (vocabulary, safe in the browser), `apps/web/src/server/services/integrations/zoho/*` (server only), routes `apps/web/src/app/api/v1/integrations/zoho/*`, Settings page `features/settings/pages/ProviderPages.tsx` (`ZohoPage`), chat cards `components/app/chat/shown/ZohoShown.tsx` (web) and `features/chat/shown/ZohoShown.tsx` (app).

## Set up (admin, once)

1. In https://api-console.zoho.com create a **Server-based Applications** client.
2. Register the redirect URI exactly: `<BETTER_AUTH_URL>/api/v1/integrations/zoho/callback` (local: `http://localhost:3000/api/v1/integrations/zoho/callback`).
3. Put `ZOHO_CLIENT_ID` and `ZOHO_CLIENT_SECRET` in `apps/web/.env.local` (never in chats, tickets or commits). `ZOHO_ACCOUNTS_SERVER` is optional (default `https://accounts.zoho.com`); people in other data centers are sent to theirs automatically.
4. Run `corepack pnpm db:migrate` (adds `user_integrations`, `integration_oauth_states`).

A client secret is either shared by all data centers or unique per data center (Zoho API console); this build uses one secret. If someone's data center needs its own, their token exchange fails with "Zoho didn't finish signing you in".

## How it works

- **Connect:** `POST /integrations/zoho/start` (picked services → scopes) → Zoho's page → `GET …/callback` (checks the one-time `state`, exchanges the code at the person's own accounts server, seals `{access, refresh}` with `sealKey` bound to the user id, stores the data center in `meta`). Only data centers in `lib/zoho` `ZOHO_ACCOUNTS_SERVERS` are ever contacted. `prompt=consent` + `access_type=offline` give a refresh token every time.
- **Tokens:** refreshed one hour at a time (one refresh per person at once; Zoho limits new tokens). A refresh Zoho refuses deletes the connection and asks the person to reconnect. Disconnect also calls Zoho's revoke endpoint (best effort).
- **Chat reads:** the assistant never sees Zoho data. For a connected person the system prompt (`zohoLine`) lists their services; the model answers with `<show-item>{"kind":"zoho","service":…,"view":…,"query":…}`; the card calls `GET /integrations/zoho/items`, which reads Zoho with the person's own token (Zoho's permissions apply).
- **Chat writes:** `zoho_crm` (Leads/Contacts/Accounts), `zoho_mail` (plain-text send) and `zoho_cliq` (post to a channel by short name) are drafts like any other: nothing is sent until the person presses the button (`POST /ai/actions`). The service re-validates every field and drops unknown ones.

## Service status

| Service | Reads | Writes | Status |
| --- | --- | --- | --- |
| CRM | leads, contacts, accounts, deals (list + search) | create lead/contact/account | docs-verified (v8) |
| Mail | inbox, unread, search | send (plain text) | docs-verified; data-center hosts follow `mail.<zone>` |
| Calendar | next 14 days | – | read verified; create event not built |
| Cliq | joined channels | post to a channel | docs-verified |
| Books | invoices, bills | – | verified from Zoho's docs (summary) |
| Expense | reports | – | docs-verified |
| Desk | tickets (list + search) | – | verified from Zoho's OpenAPI; `orgId` is sent as header **and** query |
| WorkDrive, Projects, Sign, Billing, People, Recruit | list / search | – | **Beta** — Zoho's docs for these could not be read in full, so endpoints and scope names follow Zoho's naming but are unverified against a live account. They start unticked in the connect dialog. If Zoho rejects a scope ("Invalid OAuth scope") fix it in `lib/zoho` `ZOHO_SERVICES` — one place. |

## Rules

- Never log tokens, codes, the client secret, or record text. Errors shown to people are friendly; Zoho's short message is passed on.
- A new service = an entry in `ZOHO_SERVICES` (scopes, views) + a reader in `products.ts` + the id in `packages/validation` `ZOHO_SERVICE_IDS` (a unit test keeps both lists equal) + a line in `ZOHO_VIEWS` in `prompts/chat.ts`.
- Tests: `apps/web/tests/unit/zoho.test.ts` (scopes, data-center safety, chat block parsing, readers against a mocked Zoho).
