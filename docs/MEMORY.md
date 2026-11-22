# Long-term AI memory

Opt-in, per person, **off by default** (Settings → Memory). When it is on, Naazhi remembers finished chat turns and gives the most
relevant ones from *other* chats to the model as untrusted background context.

## How it works

```
chat reply finishes ─► scheduleMemoryTurnIndexing() ─► memory_indexing_outbox (pending)
                                                          │  /api/cron/memory-indexing (every 10 min, CRON_SECRET)
                                                          ▼
                      processMemoryOutbox() ─► local E5 embedding ─► conversation_memories (pgvector, RLS)
next reply ─► isMemoryActive() ─► retrieveConversationMemories() ─► top 4 above 0.65 similarity ─► system prompt block
```

- **Store:** `public.conversation_memories` in the same PostgreSQL, with the `vector` extension (384 dimensions, cosine distance).
  Row-Level Security: only the author can read, write or delete their rows; queries run through `withUser()`. Rows are deleted with
  their chat and with the account (`on delete cascade`). No extra service, no separate backups.
- **Embeddings:** `Xenova/multilingual-e5-small` (q8) runs on the server's CPU through Transformers.js
  (`server/providers/embeddings/localE5.ts`). No text is sent to a hosted embedding API. The model (~120 MB) is downloaded from the
  Hugging Face Hub on first use (about 15 s to load) and cached in the container until the next deploy. Transformers.js is imported
  lazily, so if the native ONNX Runtime can't load, only memory stops working; chat and the build don't.
- **Docker image:** the app image is `node:24-bookworm-slim`, not Alpine, because ONNX Runtime's native library needs glibc
  (on musl it fails with `fcntl64: symbol not found`, even with gcompat). `scripts/docker/copy-runtime-deps.mjs` copies
  Transformers.js with ONNX Runtime and sharp into the standalone output, which Next's file tracing misses. The Compose `web-dev`
  service still runs on Alpine, so memory embeddings don't work there; use `pnpm dev` on the host or the `app` profile.
- **Availability:** `memoryStoreReady()` checks that the migration is applied. Without it, Settings → Memory says memory isn't
  available, it can't be switched on and nothing is queued. A failing store or model never blocks chat; the reply simply has no memories.
- **Safety:** memories are wrapped as untrusted history (`formatUntrustedMemoryContext`), never as instructions. The latest prompt is
  validated (`promptValidation.ts`) and a fixed guard is added when it shows several injection patterns.

## Turning it on in production (Azure)

1. Allow the extension on the Azure Database for PostgreSQL server: add `VECTOR` to the server parameter `azure.extensions`
   (keep the values that are already there). The user does this; agents never change server settings.
2. Apply migrations (`docs/RELEASE_FOR_AGENTS.md` §5). `20261122100000_conversation_memories.sql` runs `create extension vector`.
3. The **Notification checks** workflow calls `/api/cron/memory-indexing` every ten minutes (needs `APP_URL` and `CRON_SECRET`).

## Local development and tests

The Compose `postgres` service is `postgres:16-alpine` with pgvector built in (`docker/postgres/Dockerfile`); rebuild it once with
`docker compose --env-file .env.selfhost up -d --build postgres`, then `corepack pnpm db:migrate`.

```bash
corepack pnpm test:db                                                   # tests/db/conversation-memory.test.ts: ranking, RLS, cascades, queue
RUN_LOCAL_E5_TESTS=1 corepack pnpm --filter @untitled/web exec vitest run tests/unit/localE5.test.ts   # the real model (downloads it)
node scripts/memory/backfill.mjs --preview                              # optional: queue old chats of opted-in people (dry run by default)
```
