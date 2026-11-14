# services/notion

**Does:** connect a person's Notion through Composio, list their pages and import chosen ones as notes (Settings → Imports & backup).

- **One key for everyone.** `COMPOSIO_API_KEY` and `COMPOSIO_AUTH_CONFIG_NOTION` (see `.env.example`). Each person's connection lives at Composio under their Naazhi user id. Only `client.ts` imports `@composio/core`.
- **We store the connection id, sealed.** `user_integrations` row, provider `notion`: `secret_cipher` = connection id sealed with `keyVault` and the user id, `services` = `["pending"]` then `["connected"]`, `meta.imported` = `{ notionPageId: noteId }` so importing again adds no copies (capped at 5000).
- **Tools used** (slugs from docs.composio.dev/toolkits/notion): `NOTION_FETCH_DATA` (list pages), `NOTION_GET_PAGE_MARKDOWN` (page text), `NOTION_RETRIEVE_PAGE` (title). The docs don't describe the answers, so `pages.ts` reads them defensively; **check the list and an import against a real workspace once** after setting Composio up.
- Notion shares per page: a page the connection wasn't added to is invisible. The Settings page says how to share one.

| File | Does |
| --- | --- |
| `index.ts` | Public API; routes import from here only. |
| `client.ts` | The SDK client and settings. |
| `connection.ts` | Status, start, finish, disconnect. |
| `pages.ts` | List pages, import as notes (max 20 per call, 3 at a time). |

**Rules:** never log page text, ids of connections or the key; a page that can't be read counts as failed, it doesn't stop the import; routes under `/api/v1/integrations/notion/*`.

**Tests:** `apps/web/tests/unit/notion.test.ts`.
