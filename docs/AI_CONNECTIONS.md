# AI connections (the model picker)

**Read this when** you touch the model picker, "Connect an AI", saved provider keys or the ChatGPT sign-in.

## What a person can connect

| Connection | How | Paid by |
| --- | --- | --- |
| **Your own API key** for OpenAI, Anthropic, Google or OpenRouter ("Add key") | The key is checked against the provider's `/models`, sealed (AES-256-GCM, bound to the user id, `services/billing/keyVault.ts`) and stored in `user_ai_connections`. Once saved, the picker lists the provider's live models (curated fallback). | The provider, directly. Never counted against the plan. |
| **Your ChatGPT plan** ("Connect") | Device-code OAuth: Enable (allow device code login in ChatGPT's security settings) → Authorize (a short code approved on ChatGPT's own page; the dialog polls) → Done. Access and refresh tokens are sealed the same way and refreshed when they run out. | The person's ChatGPT plan. |

Choice ids: `own:<provider>:<model>` and `chatgpt:<model>` (`packages/logic/src/aiConnections.ts`). `services/ai/chat.ts` resolves them to credentials per request and skips the plan's allowance and metering (the person is paying someone else). Everything else still goes through `aiAccessFor()`.

## ChatGPT sign-in is OFF until configured

It needs `OPENAI_OAUTH_CLIENT_ID` (an OAuth client OpenAI has registered for this app). Without it the option reads "Not set up on this server yet" and nothing is called. Optional: `OPENAI_OAUTH_ISSUER` (default `https://auth.openai.com`), `CHATGPT_API_BASE` (default `https://chatgpt.com/backend-api/codex`), `CHATGPT_MODELS` (comma list, default `gpt-5`).

**Not verified against OpenAI's live service.** OpenAI doesn't publish a public "sign in with ChatGPT" API for third-party apps. The endpoints used (`/api/accounts/deviceauth/usercode`, `/deviceauth/token`, `/oauth/token`, and the Responses-format `…/responses` call with a `chatgpt-account-id` header) follow the device-code flow used by OpenAI's own command-line client and may change or be restricted. Use only with a client OpenAI has approved for this purpose; test with a real account before enabling.

## Where things are

```
db/migrations/20261111190000_ai_connections.sql      user_ai_connections, ai_device_logins (RLS on, no browser access)
packages/logic/src/aiConnections.ts                  providers, curated models, choice ids
packages/api-client/src/aiConnections.ts             shared by web and phone
apps/web/src/server/repositories/aiConnections.repository.ts
apps/web/src/server/services/ai/connections.service.ts   keys, device flow, token refresh, the picker's catalog
apps/web/src/server/providers/ai/chatgpt/            Responses-format streaming
apps/web/src/app/api/v1/ai/connections/              GET catalog, DELETE ?provider=, POST key | chatgpt/start | chatgpt/poll
apps/web/src/components/app/chat/{ModelPicker,ConnectAiDialog}.tsx
```

## Security

- Keys and tokens are write-only: the browser only gets a four-character hint. Never log them, codes or prompts.
- Provider addresses are fixed in code, never taken from input.
- Provider error bodies are never passed on.
- Every write route is same-origin checked (`handler({ write: true })`).
