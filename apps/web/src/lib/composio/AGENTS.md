# lib/composio

**Contents:**

- `apps.ts`: the apps reached through Composio (Gmail, Google Calendar) with their names, logos, views and the Settings page each one is connected from. Pure constants, safe in the browser.
- `catalog.ts`: the accounts and services the Settings pages and the connect dialog list (Google, Microsoft, Zoho).
- `index.ts`: older vocabulary (`IntegrationApp`, `ConnectionStatus`) kept for existing imports. New code uses `apps.ts`.

**The Composio SDK and `COMPOSIO_API_KEY` live only in `apps/web/src/server/services/composio`.** Browser code uses our `/api/v1/integrations/composio/*` routes. Never import the SDK here. **Jira:** UNT-70, UNT-71.
