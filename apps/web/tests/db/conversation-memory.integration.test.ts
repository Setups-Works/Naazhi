import { describe, expect, it, beforeAll } from "vitest";
import {
  upsertConversationMemory,
  retrieveConversationMemories,
  deleteUserConversationMemories,
  deleteAllUserConversationMemories,
  chromaHealthCheck,
} from "../../src/server/repositories/conversation-memory.repository";

const runIntegration = process.env.RUN_DB_TESTS === "1" && Boolean(process.env.CHROMA_URL);

describe.skipIf(!runIntegration)("conversation-memory integration (live ChromaDB)", () => {
  const userA = "00000000-0000-0000-0000-00000000000a";
  const userB = "00000000-0000-0000-0000-00000000000b";
  const convA1 = "11111111-1111-1111-1111-111111111111";
  const convA2 = "22222222-2222-2222-2222-222222222222";

  beforeAll(async () => {
    const health = await chromaHealthCheck();
    expect(health.configured).toBe(true);
    expect(health.healthy).toBe(true);

    // Clean up test users
    await deleteAllUserConversationMemories(userA).catch(() => undefined);
    await deleteAllUserConversationMemories(userB).catch(() => undefined);
  });

  it("stores memories, retrieves them semantically, and enforces cross-user isolation", async () => {
    // 1. Upsert for User A
    await upsertConversationMemory(userA, {
      id: "mem-a-1",
      conversationId: convA1,
      sourceUserMessageId: "33333333-3333-3333-3333-333333333333",
      sourceAssistantMessageId: "44444444-4444-4444-4444-444444444444",
      content: "The user is allergic to peanuts and shellfish.",
    });

    // 2. Upsert for User B
    await upsertConversationMemory(userB, {
      id: "mem-b-1",
      conversationId: "55555555-5555-5555-5555-555555555555",
      sourceUserMessageId: "66666666-6666-6666-6666-666666666666",
      sourceAssistantMessageId: "77777777-7777-7777-7777-777777777777",
      content: "The user loves eating peanut butter cookies and seafood.",
    });

    // 3. User A searches for allergies
    const resA = await retrieveConversationMemories(userA, "What foods should I avoid?", {
      topK: 3,
      minSimilarity: 0.6,
    });

    expect(resA.available).toBe(true);
    if (resA.available) {
      expect(resA.memories.length).toBeGreaterThan(0);
      expect(resA.memories[0].content).toContain("allergic to peanuts");
      // Must not contain User B's preferences
      expect(resA.memories.some((m) => m.content.includes("loves eating peanut"))).toBe(false);
    }

    // 4. User B searches for food preferences
    const resB = await retrieveConversationMemories(userB, "What snacks do I like?", {
      topK: 3,
      minSimilarity: 0.6,
    });

    expect(resB.available).toBe(true);
    if (resB.available) {
      expect(resB.memories.length).toBeGreaterThan(0);
      expect(resB.memories[0].content).toContain("peanut butter cookies");
      expect(resB.memories.some((m) => m.content.includes("allergic"))).toBe(false);
    }

    // 5. Delete specific conversation
    await upsertConversationMemory(userA, {
      id: "mem-a-2",
      conversationId: convA2,
      sourceUserMessageId: "88888888-8888-8888-8888-888888888888",
      sourceAssistantMessageId: "99999999-9999-9999-9999-999999999999",
      content: "The user is planning a trip to Tokyo next spring.",
    });

    await deleteUserConversationMemories(userA, convA1);

    const afterDelA = await retrieveConversationMemories(userA, "peanuts allergy", {
      topK: 3,
      minSimilarity: 0.5,
    });
    if (afterDelA.available) {
      expect(afterDelA.memories.some((m) => m.conversationId === convA1)).toBe(false);
    }

    // Clean up
    await deleteAllUserConversationMemories(userA);
    await deleteAllUserConversationMemories(userB);
  });
});
