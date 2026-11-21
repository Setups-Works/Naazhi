import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  chromaHealthCheck,
  deleteUserConversationMemories,
  retrieveConversationMemories,
  upsertConversationMemory,
} from "../../src/server/repositories/conversation-memory.repository";

const configuredUrl = process.env.CHROMA_URL;
let localHost = "";
try {
  localHost = configuredUrl ? new URL(configuredUrl).hostname : "";
} catch {
  // Invalid URLs disable these opt-in integration tests.
}
const isSafeLocalTest =
  process.env.CHROMA_INTEGRATION_TEST === "true" &&
  Boolean(process.env.CHROMA_AUTH_TOKEN) &&
  ["localhost", "127.0.0.1", "::1"].includes(localHost) &&
  (process.env.CHROMA_COLLECTION ?? "").startsWith("naazhi_test_");

const integration = describe.skipIf(!isSafeLocalTest);
const testOwnerA = `chroma-test-owner-a-${randomUUID()}`;
const testOwnerB = `chroma-test-owner-b-${randomUUID()}`;
const testConversationA = randomUUID();
const testConversationB = randomUUID();
const persistenceOwner = "naazhi-chroma-persistence-test-owner";
const persistenceConversation = "naazhi-chroma-persistence-test-conversation";
const persistenceId = process.env.CHROMA_PERSISTENCE_RECORD_ID ?? "naazhi-chroma-persistence-test-record";

function memory(id: string, conversationId: string, content: string) {
  return {
    id,
    conversationId,
    sourceUserMessageId: `${id}-user-message`,
    sourceAssistantMessageId: `${id}-assistant-message`,
    content,
  };
}

integration("local Chroma repository", () => {
  afterAll(async () => {
    await deleteUserConversationMemories(testOwnerA, testConversationA).catch(() => undefined);
    await deleteUserConversationMemories(testOwnerB, testConversationB).catch(() => undefined);
  });

  it("reports local service health without revealing credentials", async () => {
    await expect(chromaHealthCheck()).resolves.toEqual({ configured: true, healthy: true });
  });

  it("requires a valid bearer token for the Chroma API", async () => {
    const endpoint = `${configuredUrl}/api/v2/heartbeat`;
    const missingToken = await fetch(endpoint);
    const invalidToken = await fetch(endpoint, { headers: { Authorization: "Bearer invalid-test-token" } });
    const validToken = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${process.env.CHROMA_AUTH_TOKEN}` },
    });

    expect(missingToken.status).toBe(401);
    expect(invalidToken.status).toBe(401);
    expect(validToken.status).toBe(200);
  });

  it("scopes retrieval and deletion to the authenticated owner and conversation", async () => {
    await upsertConversationMemory(
      testOwnerA,
      memory(`a-${randomUUID()}`, testConversationA, "Tamil language memory retrieval test: user owns a red bicycle."),
    );
    await upsertConversationMemory(
      testOwnerB,
      memory(`b-${randomUUID()}`, testConversationB, "Tamil language memory retrieval test: user owns a blue bicycle."),
    );

    const ownerAResults = await retrieveConversationMemories(testOwnerA, "What color bicycle do I own?", { topK: 5 });
    expect(ownerAResults.available).toBe(true);
    if (!ownerAResults.available) throw new Error("Chroma should be available in this integration test.");
    expect(ownerAResults.memories.length).toBeGreaterThan(0);
    expect(ownerAResults.memories.every((item) => item.conversationId === testConversationA)).toBe(true);
    expect(ownerAResults.memories.some((item) => item.content.includes("blue bicycle"))).toBe(false);

    await deleteUserConversationMemories(testOwnerA, testConversationA);
    const ownerAAfterDelete = await retrieveConversationMemories(testOwnerA, "What color bicycle do I own?", { topK: 5 });
    const ownerBAfterDelete = await retrieveConversationMemories(testOwnerB, "What color bicycle do I own?", { topK: 5 });
    expect(ownerAAfterDelete.available && ownerAAfterDelete.memories).toHaveLength(0);
    expect(ownerBAfterDelete.available && ownerBAfterDelete.memories.some((item) => item.content.includes("blue bicycle"))).toBe(true);
  });

  const phase = process.env.CHROMA_PERSISTENCE_PHASE;
  if (phase === "seed") {
    it("writes a dedicated persistence marker before the container restart", async () => {
      await upsertConversationMemory(
        persistenceOwner,
        memory(persistenceId, persistenceConversation, "Persistence check marker for local Chroma restart."),
      );
      const result = await retrieveConversationMemories(persistenceOwner, "local Chroma restart marker", { topK: 3 });
      expect(result.available && result.memories.some((item) => item.content.includes("Persistence check marker"))).toBe(true);
    });
  } else if (phase === "verify") {
    it("reads the same persistence marker after the Chroma container restart", async () => {
      const result = await retrieveConversationMemories(persistenceOwner, "local Chroma restart marker", { topK: 3 });
      expect(result.available && result.memories.some((item) => item.content.includes("Persistence check marker"))).toBe(true);
      await deleteUserConversationMemories(persistenceOwner, persistenceConversation);
    });
  }
});
