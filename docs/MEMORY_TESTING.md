# Naazhi AI Semantic Memory — Local Docker Testing Guide

This guide walks through verifying the ChromaDB semantic memory implementation in the local Docker and development environment.

## 1. Prerequisites & Environment Setup

Ensure your local `.env.selfhost` or `apps/web/.env.local` includes the Chroma configuration:

```env
CHROMA_URL=http://localhost:8000
CHROMA_AUTH_TOKEN=your-chroma-bearer-token-here
CHROMA_COLLECTION=naazhi_conversation_memories
CRON_SECRET=local-cron-test-secret
```

## 2. Start the Docker Stack

Start the self-hosted local infrastructure:

```bash
docker compose --env-file .env.selfhost up -d
```

Verify that both ChromaDB and the Chroma Auth Gateway are running:

```bash
docker compose ps chroma chroma-auth
```

The output should show `chroma` on the internal network and `chroma-auth` listening on `127.0.0.1:8000`.

## 3. Verify Chroma Gateway Authentication

Test unauthorized access (should return HTTP 401 / 403):
```bash
curl -i http://localhost:8000/api/v1/heartbeat
```

Test authorized access with bearer token:
```bash
curl -i -H "Authorization: Bearer your-chroma-bearer-token-here" http://localhost:8000/api/v1/heartbeat
```
Expected response: HTTP 200 with heartbeat nanoseconds.

## 4. Run Automated Test Suites

### Unit Tests
Run the unit test suite covering validation, cross-user isolation, threshold filtering, and multilingual retrieval:
```bash
corepack pnpm test tests/unit/conversation-memory.test.ts tests/unit/memory-retrieval-quality.test.ts
```

### Integration Tests (Live Chroma & Database)
Run the live integration suite:
```bash
RUN_DB_TESTS=1 CHROMA_URL=http://localhost:8000 CHROMA_AUTH_TOKEN=your-chroma-bearer-token-here corepack pnpm test tests/db/conversation-memory.integration.test.ts
```

## 5. End-to-End Functional Verification Steps

### Step A: Verify Default State (Opt-In Enforced)
1. Sign in to Naazhi web app (`http://localhost:3000`).
2. Navigate to **Settings → Memory**.
3. Confirm status displays **Disabled**.
4. Send a chat message: "My favorite color is emerald green."
5. Open a new chat and ask: "What is my favorite color?"
6. Confirm the assistant responds that it does not know or asks for clarification (no memory injected).

### Step B: Enable Memory & Automatic Indexing
1. In **Settings → Memory**, click **Enable memory**.
2. Confirm status transitions to **Active**.
3. Send a message in a new chat: "I am allergic to peanuts."
4. Wait for the conversation turn to complete.
5. Trigger outbox processing (or call the cron endpoint):
   ```bash
   curl -X POST -H "Authorization: Bearer local-cron-test-secret" http://localhost:3000/api/cron/memory-indexing
   ```
6. Start a new conversation and ask: "What snacks can I eat?"
7. Verify the assistant refers to your peanut allergy safely.

### Step C: Verify Memory Pause
1. In **Settings → Memory**, click **Pause memory**.
2. Confirm status transitions to **Paused**.
3. Ask the assistant a question dependent on past memory.
4. Verify no memories are retrieved while paused.
5. Click **Resume memory** and verify retrieval resumes.

### Step D: Cross-User Isolation Verification
1. Sign out and sign in with a different test account (User B).
2. Enable memory for User B.
3. Ask about User A's facts ("What is my allergy?").
4. Verify User B has zero access to User A's stored memories.

### Step E: Container Restart & Persistence Verification
1. Restart the Chroma container:
   ```bash
   docker compose restart chroma chroma-auth
   ```
2. Re-test semantic memory retrieval in the chat app.
3. Verify data persists from the `chromadata` Docker named volume.

### Step F: Chroma Downtime Graceful Degradation
1. Temporarily stop Chroma:
   ```bash
   docker compose stop chroma chroma-auth
   ```
2. Send messages in the chat interface.
3. Verify the chat continues streaming without crashes, returning normal Groq responses.
4. Restart Chroma containers after test:
   ```bash
   docker compose start chroma chroma-auth
   ```
