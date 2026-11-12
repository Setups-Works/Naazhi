# apps/web/src/app/share — public share pages

Read-only pages that anyone with a secret link can open: `[token]` (a shared chat) and `journal/[token]` (one shared journal entry). `layout.tsx` gives them the same **minimal header** (`components/share/ShareHeader`); the landing site's header and footer are hidden on `/share/*` (`components/HideInApp.tsx`).

**Rules:** `noindex`, `referrer: no-referrer`, no author identity, looked up by exact token on the server only. New kinds of share page go under this folder so they get the same header automatically.

**Continue the conversation:** the shared chat page has a button (`components/share/ContinueChat.tsx`) that calls `POST /api/v1/shared-chats/<token>/continue`, which copies the chat (text only, no attachments) into the signed-in visitor's own chats (`server/services/chats/sharedChat.service.ts`) and opens it. `GET /api/v1/shared-chats/<token>` is the public read used by the phone app. The phone opens `https://<app host>/share/<token>` links itself (Android intent filter and iOS `applinks`, set in `apps/mobile/app.config.js`; `/.well-known/assetlinks.json` and `apple-app-site-association` are served by the website).

