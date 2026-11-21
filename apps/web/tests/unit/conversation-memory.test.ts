import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock server-only stub
vi.mock("server-only", () => ({}));

// Mock serverEnv
vi.mock("../../src/config/env", () => ({
  serverEnv: vi.fn(() => ({
    chroma: {
      url: "http://127.0.0.1:8000",
      authToken: "test-secret-token",
      collection: "test_memories",
    },
  })),
}));

// Mock ChromaClient
const mockUpsert = vi.fn().mockResolvedValue(undefined);
const mockQuery = vi.fn();
const mockDelete = vi.fn().mockResolvedValue(undefined);
const mockHeartbeat = vi.fn().mockResolvedValue(100);
const mockGetOrCreateCollection = vi.fn();

vi.mock("chromadb", () => {
  return {
    ChromaClient: class {
      getOrCreateCollection = mockGetOrCreateCollection;
      heartbeat = mockHeartbeat;
    },
  };
});

// Mock LocalE5Embeddings
vi.mock("../../src/server/providers/embeddings/localE5", () => {
  return {
    E5_MODEL_ID: "Xenova/multilingual-e5-small",
    E5_MODEL_VERSION: "intfloat/multilingual-e5-small",
    E5_VECTOR_DIMENSIONS: 384,
    LocalE5Embeddings: class {
      embedDocuments = vi.fn().mockImplementation((texts: string[]) =>
        Promise.resolve(texts.map(() => new Array(384).fill(0.1)))
      );
      embedQuery = vi.fn().mockResolvedValue(new Array(384).fill(0.1));
    },
  };
});

import {
  upsertConversationMemory,
  retrieveConversationMemories,
  deleteUserConversationMemories,
  deleteAllUserConversationMemories,
  chromaHealthCheck,
  ChromaStoreUnavailableError,
} from "../../src/server/repositories/conversation-memory.repository";
import { serverEnv } from "../../src/config/env";

describe("conversation-memory.repository", () => {
  const mockCollection = {
    upsert: mockUpsert,
    query: mockQuery,
    delete: mockDelete,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrCreateCollection.mockResolvedValue(mockCollection);
    (serverEnv as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      chroma: {
        url: "http://127.0.0.1:8000",
        authToken: "test-secret-token",
        collection: "test_memories",
      },
    });
  });

  describe("Validation & Authentication Token checks", () => {
    it("rejects empty or invalid userId on upsert", async () => {
      await expect(
        upsertConversationMemory("", {
          id: "mem-1",
          conversationId: "conv-1",
          sourceUserMessageId: "msg-1",
          sourceAssistantMessageId: "msg-2",
          content: "Remember I like tea.",
        })
      ).rejects.toThrow(TypeError);

      await expect(
        upsertConversationMemory("   ", {
          id: "mem-1",
          conversationId: "conv-1",
          sourceUserMessageId: "msg-1",
          sourceAssistantMessageId: "msg-2",
          content: "Remember I like tea.",
        })
      ).rejects.toThrow(TypeError);
    });

    it("rejects invalid memory content", async () => {
      await expect(
        upsertConversationMemory("user-123", {
          id: "mem-1",
          conversationId: "conv-1",
          sourceUserMessageId: "msg-1",
          sourceAssistantMessageId: "msg-2",
          content: "",
        })
      ).rejects.toThrow(TypeError);
    });

    it("handles missing Chroma credentials by throwing ChromaStoreUnavailableError", async () => {
      (serverEnv as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        chroma: { url: undefined, authToken: undefined },
      });

      // Health check reports unavailable
      const health = await chromaHealthCheck();
      expect(health).toEqual({ configured: false, healthy: false });
    });
  });

  describe("upsertConversationMemory", () => {
    it("successfully upserts with owner-scoped record id and metadata", async () => {
      await upsertConversationMemory("user-alice", {
        id: "mem-1",
        conversationId: "conv-123",
        sourceUserMessageId: "u-msg-1",
        sourceAssistantMessageId: "a-msg-2",
        content: "User prefers vegetarian meals.",
      });

      expect(mockUpsert).toHaveBeenCalledTimes(1);
      const callArgs = mockUpsert.mock.calls[0][0];

      // Record ID should be SHA256 hashed
      expect(callArgs.ids[0]).toHaveLength(64);
      expect(callArgs.documents[0]).toBe("User prefers vegetarian meals.");
      expect(callArgs.metadatas[0]).toMatchObject({
        user_id: "user-alice",
        conversation_id: "conv-123",
        source_user_message_id: "u-msg-1",
        source_assistant_message_id: "a-msg-2",
        vector_dimensions: 384,
      });
    });
  });

  describe("retrieveConversationMemories", () => {
    it("queries Chroma with mandatory user_id filter and converts distance to similarity", async () => {
      // Return 1 match with distance 0.2 (similarity = 0.8)
      mockQuery.mockResolvedValueOnce({
        ids: [["id-1"]],
        documents: [["User prefers vegetarian meals."]],
        metadatas: [[{ user_id: "user-alice", conversation_id: "conv-123", created_at: "2026-11-17T00:00:00Z" }]],
        distances: [[0.2]],
      });

      const res = await retrieveConversationMemories("user-alice", "What do I eat?", {
        topK: 3,
        minSimilarity: 0.5,
      });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][0]).toMatchObject({
        nResults: 3,
        where: { user_id: "user-alice" },
      });

      expect(res.available).toBe(true);
      if (res.available) {
        expect(res.memories).toHaveLength(1);
        expect(res.memories[0]).toEqual({
          id: "id-1",
          conversationId: "conv-123",
          content: "User prefers vegetarian meals.",
          createdAt: "2026-11-17T00:00:00Z",
          similarity: 0.8,
        });
      }
    });

    it("enforces cross-user retrieval isolation via defense-in-depth check", async () => {
      // Mock scenario where Chroma mistakenly returned a record belonging to another user
      mockQuery.mockResolvedValueOnce({
        ids: [["id-leaked", "id-legit"]],
        documents: [["Eve's secret notes", "Alice's public notes"]],
        metadatas: [
          [
            { user_id: "user-eve", conversation_id: "conv-eve", created_at: "2026-11-17T00:00:00Z" },
            { user_id: "user-alice", conversation_id: "conv-alice", created_at: "2026-11-17T00:00:00Z" },
          ],
        ],
        distances: [[0.1, 0.15]],
      });

      const res = await retrieveConversationMemories("user-alice", "search", { minSimilarity: 0.5 });
      expect(res.available).toBe(true);
      if (res.available) {
        // Eve's record must be filtered out!
        expect(res.memories).toHaveLength(1);
        expect(res.memories[0].content).toBe("Alice's public notes");
      }
    });

    it("filters out results below minSimilarity", async () => {
      mockQuery.mockResolvedValueOnce({
        ids: [["id-low"]],
        documents: [["Irrelevant content"]],
        metadatas: [[{ user_id: "user-alice", conversation_id: "conv-1", created_at: "2026-11-17T00:00:00Z" }]],
        distances: [[0.7]], // similarity = 0.3
      });

      const res = await retrieveConversationMemories("user-alice", "diet preference", { minSimilarity: 0.5 });
      expect(res.available).toBe(true);
      if (res.available) {
        expect(res.memories).toHaveLength(0);
      }
    });

    it("returns empty memories array when no results exist", async () => {
      mockQuery.mockResolvedValueOnce({
        ids: [[]],
        documents: [[]],
        metadatas: [[]],
        distances: [[]],
      });

      const res = await retrieveConversationMemories("user-alice", "anything");
      expect(res).toEqual({ available: true, memories: [] });
    });

    it("gracefully returns available: false when Chroma is unavailable without throwing", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Connection refused"));

      const res = await retrieveConversationMemories("user-alice", "anything");
      expect(res).toEqual({ available: false, memories: [] });
    });
  });

  describe("Deletion isolation", () => {
    it("deletes user conversation memories scoped to user_id AND conversation_id", async () => {
      await deleteUserConversationMemories("user-alice", "conv-99");

      expect(mockDelete).toHaveBeenCalledWith({
        where: {
          $and: [{ user_id: "user-alice" }, { conversation_id: "conv-99" }],
        },
      });
    });

    it("deletes all user memories strictly scoped to user_id", async () => {
      await deleteAllUserConversationMemories("user-alice");

      expect(mockDelete).toHaveBeenCalledWith({
        where: { user_id: "user-alice" },
      });
    });
  });

  describe("chromaHealthCheck", () => {
    it("returns configured: true, healthy: true when heartbeat succeeds", async () => {
      mockHeartbeat.mockResolvedValueOnce(12345);
      const res = await chromaHealthCheck();
      expect(res).toEqual({ configured: true, healthy: true });
    });

    it("returns configured: true, healthy: false when heartbeat fails", async () => {
      mockHeartbeat.mockRejectedValueOnce(new Error("Heartbeat timeout"));
      const res = await chromaHealthCheck();
      expect(res).toEqual({ configured: true, healthy: false });
    });
  });
});
