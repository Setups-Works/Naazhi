# Naazhi AI Long-Term Semantic Memory — Implementation Report

## 1. Executive Summary

The long-term semantic memory system for Naazhi has been implemented following the architectural foundation established in Phase 1, strictly adhering to all system constraints:
- **Zero modification** to Groq API integration, Better Auth authentication, or existing PostgreSQL chat history.
- **Strict User Isolation:** Client-supplied user IDs are never trusted; user identity is always derived server-side via Better Auth.
- **Opt-in By Default:** Memory is disabled for every user until explicitly enabled in Settings.
- **Graceful Degradation:** If ChromaDB is unavailable or encounters errors, the chat pipeline continues streaming without disruption.
- **Untrusted Context Guard:** Retrieved memories are injected into the prompt as bounded, untrusted reference context—never as system instructions.
- **No pgvector, No Qdrant, No Python:** Pure TypeScript/Node.js architecture utilizing local quantized multilingual E5 embeddings and ChromaDB.

---

## 2. Files Added and Modified

### Database Migrations
- `db/migrations/20261117180000_memory_preferences.sql` (User opt-in preference with owner RLS)
- `db/migrations/20261117190000_memory_indexing_outbox.sql` (PostgreSQL outbox queue for non-blocking indexing)

### Core Server Services & Repositories
- `apps/web/src/server/services/memory/memory-config.ts` (Retrieval configuration, cosine threshold, context formatting)
- `apps/web/src/server/services/memory/memory-preferences.service.ts` (Preference state management)
- `apps/web/src/server/services/memory/memory-indexing.service.ts` (Outbox enqueuing, idempotent background indexing)
- `apps/web/src/server/services/ai/chat.ts` (Modified: integrated memory retrieval and outbox indexing)
- `apps/web/src/server/db/schema.ts` (Modified: registered `user_memory_preferences` in client tables)

### API Route Endpoints
- `apps/web/src/app/api/v1/memory/preferences/route.ts` (`GET` user memory status)
- `apps/web/src/app/api/v1/memory/enable/route.ts` (`POST` opt-in)
- `apps/web/src/app/api/v1/memory/pause/route.ts` (`POST` pause retrieval and indexing)
- `apps/web/src/app/api/v1/memory/resume/route.ts` (`POST` resume active memory)
- `apps/web/src/app/api/v1/memory/all/route.ts` (`DELETE` purge personal memories from Chroma)
- `apps/web/src/app/api/v1/memory/conversation/[chatId]/route.ts` (`DELETE` purge specific conversation memories)
- `apps/web/src/app/api/cron/memory-indexing/route.ts` (`POST` outbox processor authenticated via `CRON_SECRET`)

### User Interface & Client Logic
- `apps/web/src/features/settings/pages/MemorySettings.tsx` (Naazhi design token-compliant UI)
- `apps/web/src/features/settings/hooks/useMemoryPreferences.ts` (TanStack Query hooks)
- `apps/web/src/features/settings/tabs.ts` (Modified: registered `"memory"` tab and slug)
- `apps/web/src/lib/query/keys.ts` (Modified: registered `qk.memory.preferences`)
- `apps/web/src/components/app/SettingsView.tsx` (Modified: mounted Memory tab into dashboard settings)

### Offline Utilities & Scripts
- `scripts/memory/backfill.mjs` (Admin-controlled historical backfill script with `--preview` default)

### Documentation & Test Suites
- `apps/web/tests/unit/conversation-memory.test.ts` (Unit tests mocking Chroma & E5)
- `apps/web/tests/unit/memory-retrieval-quality.test.ts` (Multilingual quality & Tanglish tests)
- `apps/web/tests/db/conversation-memory.integration.test.ts` (Live Chroma integration tests)
- `docs/MEMORY_TESTING.md` (Local Docker verification instructions)
- `docs/MEMORY_AZURE_DEPLOYMENT.md` (Production Azure deployment architecture)
- `docs/DATA_MODEL.md` (Updated data model documentation)

---

## 3. Architecture Details

### Embeddings & Vector Search
- **Model:** `intfloat/multilingual-e5-small` (384 dimensions, quantized `q8`).
- **Prefixes:** `passage: ` for stored document chunks; `query: ` for search queries.
- **Similarity Metric:** Cosine space.
- **Conversion Formula:** `similarity = 1 - cosine_distance`.
- **Threshold:** Calibrated to `0.65` (distance `<= 0.35`) to separate strong semantic signals from background noise across English, Tamil, and Tanglish.

### Multi-Tenant Isolation (Defense-in-Depth)
1. **Deterministic Scoped ID:** Record IDs in Chroma are `SHA256(userId + "\0" + recordId)`.
2. **Mandatory Metadata Filter:** All Chroma queries apply `{ user_id: ownerId }`.
3. **Defense-in-Depth Validation:** Query results are inspected before formatting; any record whose metadata `user_id` does not match the session user is discarded.
4. **PostgreSQL RLS:** User preferences table enforces `user_id = auth.uid()`.

### Asynchronous Indexing (PostgreSQL Outbox)
Chat response latency is protected by queueing completed conversation turns into `memory_indexing_outbox`. Background cron processing generates deterministic embeddings and upserts them to ChromaDB with automatic retries up to 5 attempts.

---

## 4. Verification & Next Steps

All application components have been created and type-aligned with existing project standards. To test and verify in terminal:

```bash
# 1. Typecheck the monorepo
corepack pnpm typecheck

# 2. Run unit tests
corepack pnpm test tests/unit/conversation-memory.test.ts tests/unit/memory-retrieval-quality.test.ts

# 3. Apply database migrations
corepack pnpm db:migrate

# 4. Run design system verification
corepack pnpm check:design
```
