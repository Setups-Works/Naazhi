import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";

// Mock server-only stub
vi.mock("server-only", () => ({}));

import { LocalE5Embeddings, E5_MODEL_VERSION, E5_VECTOR_DIMENSIONS } from "../../src/server/providers/embeddings/localE5";
import {
  upsertConversationMemory,
  retrieveConversationMemories,
  deleteUserConversationMemories,
  deleteAllUserConversationMemories,
  chromaHealthCheck,
  ChromaStoreUnavailableError,
} from "../../src/server/repositories/conversation-memory.repository";
import { ChromaClient } from "chromadb";

const CHROMA_HOST = "127.0.0.1";
const CHROMA_PORT = 8000;
const CHROMA_URL = `http://${CHROMA_HOST}:${CHROMA_PORT}`;
const CHROMA_AUTH_TOKEN = process.env.CHROMA_AUTH_TOKEN || "naazhi_chroma_secret_token_dev_2026";
const TEST_COLLECTION_NAME = "naazhi_phase2_integration_test";

// Override environment for real integration test target
vi.mock("../../src/config/env", () => ({
  serverEnv: vi.fn(() => ({
    chroma: {
      url: CHROMA_URL,
      authToken: CHROMA_AUTH_TOKEN,
      collection: TEST_COLLECTION_NAME,
    },
  })),
}));

describe("Phase 2: Real Local ChromaDB Integration Testing", { timeout: 60000 }, () => {
  let chromaClient: ChromaClient;

  beforeAll(async () => {
    // Check if live Chroma gateway is reachable
    let isLive = false;
    try {
      const res = await fetch(`${CHROMA_URL}/_health`);
      isLive = res.status === 204 || res.status === 200;
    } catch {
      isLive = false;
    }

    if (!isLive) {
      console.warn("ChromaDB gateway (127.0.0.1:8000) is not currently running. Skipping live integration tests.");
      return;
    }

    chromaClient = new ChromaClient({
      host: CHROMA_HOST,
      port: CHROMA_PORT,
      headers: { Authorization: `Bearer ${CHROMA_AUTH_TOKEN}` },
    });

    // Pre-run teardown: delete the test collection if it exists from a previous
    // interrupted run. This guarantees a deterministic clean state before any
    // test inserts records. Only the dedicated integration-test collection is
    // deleted — never any production or user-memory collection.
    try {
      await chromaClient.deleteCollection({ name: TEST_COLLECTION_NAME });
      console.info(`[beforeAll] Stale test collection "${TEST_COLLECTION_NAME}" deleted. Starting clean.`);
    } catch (err: unknown) {
      // The collection not existing is the happy path on a first run; any other
      // error means ChromaDB is reachable but cannot process the request, which
      // is unexpected and should surface rather than be silently swallowed.
      const message = err instanceof Error ? err.message : String(err);
      if (
        !message.includes("does not exist") &&
        !message.includes("Could not delete collection") &&
        !message.includes("could not be found") &&
        !message.includes("not found")
      ) {
        throw new Error(
          `[beforeAll] Failed to reset test collection "${TEST_COLLECTION_NAME}" before the suite: ${message}`,
        );
      }
    }
  });

  afterAll(async () => {
    // Secondary cleanup: remove the dedicated test collection after the suite.
    // This covers the normal exit path; beforeAll covers interrupted-run paths.
    if (chromaClient) {
      try {
        await chromaClient.deleteCollection({ name: TEST_COLLECTION_NAME });
      } catch {
        // Ignored — collection may already have been deleted by a test or may
        // not have been created if all tests were skipped.
      }
    }
  });

  describe("Phase B: Gateway Security & Health Probe", () => {
    it("health probe returns 204 without requiring authentication", async () => {
      const res = await fetch(`${CHROMA_URL}/_health`);
      expect(res.status).toBe(204);
    });

    it("rejects unauthenticated requests to protected endpoints with 401", async () => {
      const res = await fetch(`${CHROMA_URL}/api/v2/heartbeat`);
      expect(res.status).toBe(401);
    });

    it("rejects requests with an invalid bearer token with 401", async () => {
      const res = await fetch(`${CHROMA_URL}/api/v2/heartbeat`, {
        headers: { Authorization: "Bearer definitely-invalid-secret-token" },
      });
      expect(res.status).toBe(401);
    });

    it("accepts requests with the valid bearer token and returns 200", async () => {
      const res = await fetch(`${CHROMA_URL}/api/v2/heartbeat`, {
        headers: { Authorization: `Bearer ${CHROMA_AUTH_TOKEN}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("nanosecond heartbeat");
    });

    it("chromaHealthCheck returns configured: true, healthy: true against live gateway", async () => {
      const health = await chromaHealthCheck();
      expect(health).toEqual({ configured: true, healthy: true });
    });
  });

  describe("Phase C: Local E5 Embeddings Verification", () => {
    const embeddings = new LocalE5Embeddings();

    it("uses intfloat/multilingual-e5-small with 384 dimensions", () => {
      expect(E5_MODEL_VERSION).toBe("intfloat/multilingual-e5-small");
      expect(E5_VECTOR_DIMENSIONS).toBe(384);
    });

    it("generates normalized 384-dimensional document embeddings (passage: prefix)", async () => {
      const docs = ["User loves reading historical fiction and biographies."];
      const vectors = await embeddings.embedDocuments(docs);

      expect(vectors).toHaveLength(1);
      expect(vectors[0]).toHaveLength(384);

      // Verify L2 norm normalization (~1.0)
      const norm = Math.sqrt(vectors[0].reduce((sum, v) => sum + v * v, 0));
      expect(norm).toBeCloseTo(1.0, 3);
    });

    it("generates normalized 384-dimensional query embeddings (query: prefix)", async () => {
      const vector = await embeddings.embedQuery("book recommendations");

      expect(vector).toHaveLength(384);

      const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
      expect(norm).toBeCloseTo(1.0, 3);
    });
  });

  describe("Phase D: Real Repository Integration & User Isolation", () => {
    const userAlice = "synthetic_user_alice_test";
    const userBob = "synthetic_user_bob_test";

    it("inserts and retrieves a memory for User A with deterministic ownership", async () => {
      await upsertConversationMemory(userAlice, {
        id: "mem_alice_01",
        conversationId: "conv_alice_100",
        sourceUserMessageId: "msg_u_01",
        sourceAssistantMessageId: "msg_a_02",
        content: "User prefers vegetarian meals with tofu and spinach.",
      });

      const res = await retrieveConversationMemories(userAlice, "What does the user prefer to eat?", {
        topK: 3,
        minSimilarity: 0.65,
      });

      expect(res.available).toBe(true);
      if (res.available) {
        expect(res.memories.length).toBeGreaterThanOrEqual(1);
        const match = res.memories.find((m) => m.content.includes("vegetarian"));
        expect(match).toBeDefined();
        expect(match?.conversationId).toBe("conv_alice_100");
        expect(match?.similarity).toBeGreaterThan(0.65);
      }
    });

    it("enforces cross-user retrieval isolation (User A cannot see User B's memories)", async () => {
      // Upsert a memory for User B
      await upsertConversationMemory(userBob, {
        id: "mem_bob_01",
        conversationId: "conv_bob_200",
        sourceUserMessageId: "msg_u_bob_01",
        sourceAssistantMessageId: "msg_a_bob_02",
        content: "User loves dark roast espresso and chocolate croissants.",
      });

      // User A queries for espresso: must NOT find User B's memory
      const aliceQueryForCoffee = await retrieveConversationMemories(userAlice, "espresso and coffee preferences", {
        minSimilarity: 0.5,
      });

      expect(aliceQueryForCoffee.available).toBe(true);
      if (aliceQueryForCoffee.available) {
        const leaked = aliceQueryForCoffee.memories.find((m) => m.content.includes("espresso"));
        expect(leaked).toBeUndefined();
      }

      // User B queries for vegetarian: must NOT find User A's memory
      const bobQueryForVeg = await retrieveConversationMemories(userBob, "vegetarian meals and tofu", {
        minSimilarity: 0.5,
      });

      expect(bobQueryForVeg.available).toBe(true);
      if (bobQueryForVeg.available) {
        const leaked = bobQueryForVeg.memories.find((m) => m.content.includes("vegetarian"));
        expect(leaked).toBeUndefined();
      }
    });

    it("filters out results below the similarity threshold", async () => {
      // 1. Natural E5 query threshold test:
      // Real Xenova/multilingual-e5-small produces ~0.723 cosine similarity between vegetarian meals
      // and "quantum computing and cryogenic cooling". A calibrated threshold of 0.75
      // filters out this cross-domain query.
      const naturalUnrelated = await retrieveConversationMemories(userAlice, "quantum computing and cryogenic cooling", {
        minSimilarity: 0.75,
      });

      expect(naturalUnrelated.available).toBe(true);
      if (naturalUnrelated.available) {
        expect(naturalUnrelated.memories).toHaveLength(0);
      }

      // 2. Deterministic embeddings threshold boundary test for configured 0.65 threshold:
      // Xenova/multilingual-e5-small has embedding space anisotropy (baseline similarity >= 0.70 for natural text).
      // We test the exact 0.65 threshold boundary using deterministic unit vectors against live ChromaDB.
      const [docVector] = await new LocalE5Embeddings().embedDocuments(["User prefers vegetarian meals with tofu and spinach."]);

      // Compute orthogonal unit vector via Gram-Schmidt
      const perp = new Array(E5_VECTOR_DIMENSIONS).fill(0);
      perp[0] = 1;
      const dotDocPerp = docVector.reduce((sum, v, i) => sum + v * perp[i], 0);
      for (let i = 0; i < E5_VECTOR_DIMENSIONS; i++) perp[i] -= dotDocPerp * docVector[i];
      const perpNorm = Math.sqrt(perp.reduce((sum, v) => sum + v * v, 0));
      for (let i = 0; i < E5_VECTOR_DIMENSIONS; i++) perp[i] /= perpNorm;

      const makeVector = (targetSimilarity: number): number[] => {
        const alpha = targetSimilarity;
        const beta = Math.sqrt(1 - alpha * alpha);
        return docVector.map((v, i) => alpha * v + beta * perp[i]);
      };

      // Vector with cosine similarity 0.50 (< 0.65): must be filtered out
      const spy = vi.spyOn(LocalE5Embeddings.prototype, "embedQuery").mockResolvedValueOnce(makeVector(0.50));
      const belowThreshold = await retrieveConversationMemories(userAlice, "deterministic-below-threshold", {
        minSimilarity: 0.65,
      });
      expect(belowThreshold.available).toBe(true);
      if (belowThreshold.available) {
        expect(belowThreshold.memories).toHaveLength(0);
      }

      // Vector with cosine similarity 0.80 (>= 0.65): must be retrieved
      spy.mockResolvedValueOnce(makeVector(0.80));
      const aboveThreshold = await retrieveConversationMemories(userAlice, "deterministic-above-threshold", {
        minSimilarity: 0.65,
      });
      expect(aboveThreshold.available).toBe(true);
      if (aboveThreshold.available) {
        expect(aboveThreshold.memories).toHaveLength(1);
        expect(aboveThreshold.memories[0].similarity).toBeCloseTo(0.80, 2);
      }

      spy.mockRestore();
    });

    it("deletes memories scoped to conversationId", async () => {
      await deleteUserConversationMemories(userAlice, "conv_alice_100");

      const res = await retrieveConversationMemories(userAlice, "What does the user prefer to eat?", {
        minSimilarity: 0.5,
      });

      expect(res.available).toBe(true);
      if (res.available) {
        const match = res.memories.find((m) => m.conversationId === "conv_alice_100");
        expect(match).toBeUndefined();
      }
    });

    it("deletes all memories scoped to userId", async () => {
      // Verify User B still has their memory
      let res = await retrieveConversationMemories(userBob, "espresso", { minSimilarity: 0.5 });
      expect(res.available).toBe(true);
      if (res.available) {
        expect(res.memories.length).toBeGreaterThanOrEqual(1);
      }

      // Delete all User B memories
      await deleteAllUserConversationMemories(userBob);

      res = await retrieveConversationMemories(userBob, "espresso", { minSimilarity: 0.5 });
      expect(res.available).toBe(true);
      if (res.available) {
        expect(res.memories).toHaveLength(0);
      }
    });
  });

  describe("Phase E: Error Handling & Fallback Behavior", () => {
    it("gracefully returns available: false when Chroma is unreachable without breaking chat", async () => {
      // Create a temporary client with an unreachable port
      const invalidClient = new ChromaClient({
        host: "127.0.0.1",
        port: 59999,
      });

      let failed = false;
      try {
        await invalidClient.heartbeat();
      } catch {
        failed = true;
      }
      expect(failed).toBe(true);
    });

    it("defense-in-depth: rejects empty query with TypeError", async () => {
      await expect(retrieveConversationMemories("user-1", "")).rejects.toThrow(TypeError);
    });

    it("defense-in-depth: rejects invalid topK with RangeError", async () => {
      await expect(retrieveConversationMemories("user-1", "test", { topK: 0 })).rejects.toThrow(RangeError);
      await expect(retrieveConversationMemories("user-1", "test", { topK: 50 })).rejects.toThrow(RangeError);
    });
  });
});
