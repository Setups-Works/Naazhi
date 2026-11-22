import { createHash, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// The real E5 model is a ~120 MB download; here a deterministic bag-of-words embedder stands in so these tests check the database
// side (pgvector ranking, Row-Level Security, cascades, the indexing queue). The model itself has its own opt-in test (localE5.test.ts).
vi.mock("../../src/server/providers/embeddings/localE5", () => {
  const dims = 384;
  const embed = (text: string) => {
    const v = new Array<number>(dims).fill(0);
    v[0] = 0.01;
    for (const word of text.toLowerCase().replace(/^(query|passage): /, "").match(/[a-z]+/g) ?? []) {
      v[createHash("sha1").update(word).digest()[0] % (dims - 1) + 1] += 1;
    }
    const norm = Math.hypot(...v);
    return v.map((x) => x / norm);
  };
  return {
    E5_MODEL_ID: "test",
    E5_MODEL_VERSION: "test-bow",
    E5_VECTOR_DIMENSIONS: dims,
    LocalE5Embeddings: class {
      async embedQuery(text: string) {
        return embed(text);
      }
      async embedDocuments(texts: string[]) {
        return texts.map(embed);
      }
    },
  };
});

const { pool, withUser } = await import("../../src/server/db/pool");
const repo = await import("../../src/server/repositories/conversation-memory.repository");
const prefs = await import("../../src/server/services/memory/memory-preferences.service");
const indexing = await import("../../src/server/services/memory/memory-indexing.service");

/** Run with `corepack pnpm test:db` (needs the pgvector postgres from docker compose and `corepack pnpm db:migrate`). */
const run = Date.now().toString(36);
const user = { a: "", b: "" };
const chat = { a1: "", a2: "", b1: "" };

async function newChat(userId: string): Promise<string> {
  const { rows } = await pool().query<{ id: string }>("insert into public.chats (user_id, title) values ($1, 'memory test') returning id", [userId]);
  return rows[0].id;
}

const memory = (id: string, conversationId: string, content: string) => ({
  id,
  conversationId,
  sourceUserMessageId: `${id}-u`,
  sourceAssistantMessageId: `${id}-a`,
  content,
});

beforeAll(async () => {
  for (const tag of ["a", "b"] as const) {
    const { rows } = await pool().query<{ id: string }>("insert into auth.users (name, email) values ($1, $2) returning id", [
      `mem ${tag}`,
      `mem-${tag}-${run}@example.test`,
    ]);
    user[tag] = rows[0].id;
  }
  chat.a1 = await newChat(user.a);
  chat.a2 = await newChat(user.a);
  chat.b1 = await newChat(user.b);
});

afterAll(async () => {
  await pool().query("delete from auth.users where email like $1", [`mem-%-${run}@example.test`]);
  await pool().end();
});

describe("conversation memories (pgvector)", () => {
  it("is ready once the migration is applied", async () => {
    expect(await repo.memoryStoreReady()).toBe(true);
  });

  it("ranks a person's own memories by meaning and never returns someone else's", async () => {
    await repo.upsertConversationMemory(user.a, memory("a-allergy", chat.a1, "I am allergic to peanuts and shellfish"));
    await repo.upsertConversationMemory(user.a, memory("a-travel", chat.a2, "Planning a trip to Kyoto in spring"));
    await repo.upsertConversationMemory(user.b, memory("b-food", chat.b1, "I love peanuts and shellfish every day"));

    const a = await repo.retrieveConversationMemories(user.a, "which foods like peanuts should I avoid", { topK: 5 });
    expect(a.available).toBe(true);
    expect(a.memories[0]?.content).toContain("allergic to peanuts");
    expect(a.memories.every((m) => m.conversationId === chat.a1 || m.conversationId === chat.a2)).toBe(true);
    expect(a.memories[0].similarity).toBeGreaterThan(a.memories[1].similarity);

    const b = await repo.retrieveConversationMemories(user.b, "peanuts shellfish", { topK: 5 });
    expect(b.memories.map((m) => m.content)).toEqual(["I love peanuts and shellfish every day"]);
  });

  it("drops matches under the similarity threshold", async () => {
    const r = await repo.retrieveConversationMemories(user.a, "quantum cryogenic", { topK: 5, minSimilarity: 0.5 });
    expect(r.available).toBe(true);
    expect(r.memories).toEqual([]);
  });

  it("re-indexing the same turn replaces it instead of adding a copy", async () => {
    await repo.upsertConversationMemory(user.a, memory("a-travel", chat.a2, "Planning a trip to Osaka in autumn"));
    const { rows } = await pool().query("select content from public.conversation_memories where user_id = $1 and chat_id = $2", [user.a, chat.a2]);
    expect(rows).toEqual([{ content: "Planning a trip to Osaka in autumn" }]);
  });

  it("Row-Level Security hides other people's memories and refuses writing as them", async () => {
    const seen = await withUser(user.b, (c) => c.query("select user_id from public.conversation_memories"));
    expect(seen.rows.every((r: { user_id: string }) => r.user_id === user.b)).toBe(true);

    await expect(
      withUser(user.b, (c) =>
        c.query(
          `insert into public.conversation_memories (id, user_id, chat_id, content, embedding, model_version)
           values ('forged', $1, $2, 'x', $3::vector, 'test-bow')`,
          [user.a, chat.a1, repo.toVectorLiteral(new Array(384).fill(1 / Math.sqrt(384)))],
        ),
      ),
    ).rejects.toThrow(/row-level security/);

    const deleted = await withUser(user.b, (c) => c.query("delete from public.conversation_memories where user_id = $1", [user.a]));
    expect(deleted.rowCount).toBe(0);
  });

  it("deletes one chat's memories, and a deleted chat takes its memories with it", async () => {
    await repo.deleteUserConversationMemories(user.a, chat.a2);
    let r = await repo.retrieveConversationMemories(user.a, "trip", { topK: 5 });
    expect(r.memories.some((m) => m.conversationId === chat.a2)).toBe(false);

    await pool().query("delete from public.chats where id = $1", [chat.a1]);
    r = await repo.retrieveConversationMemories(user.a, "peanuts", { topK: 5 });
    expect(r.memories).toEqual([]);
  });

  it("clearing all memories leaves other people's alone", async () => {
    await repo.deleteAllUserConversationMemories(user.a);
    const b = await repo.retrieveConversationMemories(user.b, "peanuts", { topK: 5 });
    expect(b.memories).toHaveLength(1);
  });
});

describe("memory preferences and the indexing queue", () => {
  it("is off by default and available once the store exists", async () => {
    const p = await prefs.getMemoryPreference(user.a);
    expect(p).toMatchObject({ enabled: false, paused: false, available: true });
    expect(await prefs.isMemoryActive(user.a)).toBe(false);
  });

  it("queues nothing while memory is off", async () => {
    await indexing.scheduleMemoryTurnIndexing({ userId: user.a, chatId: chat.a2, userText: "secret", assistantText: "noted" });
    const { rows } = await pool().query("select 1 from public.memory_indexing_outbox where user_id = $1", [user.a]);
    expect(rows).toHaveLength(0);
  });

  it("indexes a finished turn once memory is on, and finds it from another chat", async () => {
    await prefs.enableMemory(user.a);
    expect(await prefs.isMemoryActive(user.a)).toBe(true);
    const fresh = await newChat(user.a);
    await indexing.scheduleMemoryTurnIndexing({
      userId: user.a,
      chatId: fresh,
      userMessageId: randomUUID(),
      userText: "My daughter is called Meera",
      assistantText: "Lovely name, I will remember Meera",
    });
    const result = await indexing.processMemoryOutbox(50);
    expect(result.succeeded).toBeGreaterThanOrEqual(1);
    const r = await repo.retrieveConversationMemories(user.a, "what is my daughter called", { topK: 3 });
    expect(r.memories[0]?.content).toContain("Meera");
  });

  it("marks a turn whose chat was deleted as done instead of retrying it", async () => {
    const gone = await newChat(user.a);
    await indexing.scheduleMemoryTurnIndexing({ userId: user.a, chatId: gone, userMessageId: randomUUID(), userText: "hello", assistantText: "hi" });
    await pool().query("delete from public.chats where id = $1", [gone]);
    await indexing.processMemoryOutbox(50);
    const { rows } = await pool().query<{ status: string }>("select status from public.memory_indexing_outbox where chat_id = $1", [gone]);
    expect(rows).toEqual([{ status: "done" }]);
  });

  it("pausing stops retrieval in chat but keeps what is stored", async () => {
    await prefs.pauseMemory(user.a);
    expect(await prefs.isMemoryActive(user.a)).toBe(false);
    const { rows } = await pool().query("select 1 from public.conversation_memories where user_id = $1", [user.a]);
    expect(rows.length).toBeGreaterThan(0);
  });
});
