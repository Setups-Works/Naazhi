import "server-only";

import { createHash } from "node:crypto";
import { ChromaClient, type Collection, type Metadata, type Where } from "chromadb";
import { serverEnv } from "../../config/env";
import { LocalE5Embeddings, E5_MODEL_VERSION, E5_VECTOR_DIMENSIONS } from "../providers/embeddings/localE5";

const DEFAULT_COLLECTION = "naazhi_conversation_memories";
const embeddings = new LocalE5Embeddings();

export interface ConversationMemoryInput {
  id: string;
  conversationId: string;
  sourceUserMessageId: string;
  sourceAssistantMessageId: string;
  content: string;
  createdAt?: string;
}

export interface RetrievedConversationMemory {
  id: string;
  conversationId: string;
  content: string;
  createdAt: string;
  similarity: number;
}

export type MemoryRetrievalResult =
  | { available: true; memories: RetrievedConversationMemory[] }
  | { available: false; memories: [] };

export class ChromaStoreUnavailableError extends Error {
  constructor() {
    super("The local semantic memory store is unavailable.");
    this.name = "ChromaStoreUnavailableError";
  }
}

let client: ChromaClient | undefined;
let collectionPromise: Promise<Collection> | undefined;

function requireUserId(userId: string): string {
  if (typeof userId !== "string" || userId.trim().length === 0 || userId.length > 200) {
    throw new TypeError("A valid authenticated user id is required for memory access.");
  }
  return userId;
}

function configuredClient(): ChromaClient {
  if (client) return client;

  const config = serverEnv().chroma;
  if (!config.url || !config.authToken) throw new ChromaStoreUnavailableError();

  let url: URL;
  try {
    url = new URL(config.url);
  } catch {
    throw new ChromaStoreUnavailableError();
  }
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    !url.hostname ||
    url.username ||
    url.password ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.search ||
    url.hash
  ) {
    throw new ChromaStoreUnavailableError();
  }

  client = new ChromaClient({
    host: url.hostname,
    port: url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 8000,
    ssl: url.protocol === "https:",
    headers: { Authorization: `Bearer ${config.authToken}` },
  });
  return client;
}

async function getCollection(): Promise<Collection> {
  if (!collectionPromise) {
    const config = serverEnv().chroma;
    const chromaClient = configuredClient();
    collectionPromise = chromaClient
      .getOrCreateCollection({
        name: config.collection ?? DEFAULT_COLLECTION,
        metadata: {
          "hnsw:space": "cosine",
          app: "naazhi",
          embedding_model: E5_MODEL_VERSION,
          embedding_dimensions: E5_VECTOR_DIMENSIONS,
        },
        // Vectors are generated locally by LocalE5Embeddings; Chroma must not choose a provider.
        embeddingFunction: null,
      })
      .catch((error: unknown) => {
        collectionPromise = undefined;
        throw error;
      });
  }
  return collectionPromise;
}

function validateMemory(input: ConversationMemoryInput): void {
  if (!input.id || !input.conversationId || !input.sourceUserMessageId || !input.sourceAssistantMessageId) {
    throw new TypeError("Memory ids and source message ids are required.");
  }
  if (typeof input.content !== "string" || input.content.trim().length === 0) {
    throw new TypeError("Memory content must not be empty.");
  }
}

function ownerScopedRecordId(userId: string, recordId: string): string {
  return createHash("sha256").update(userId).update("\0").update(recordId).digest("hex");
}

function wrapStoreError(): ChromaStoreUnavailableError {
  return new ChromaStoreUnavailableError();
}

/** The token only authenticates this server to Chroma; user ownership is always explicit in the record and filter. */
export async function upsertConversationMemory(userId: string, input: ConversationMemoryInput): Promise<void> {
  const ownerId = requireUserId(userId);
  validateMemory(input);

  const [vector] = await embeddings.embedDocuments([input.content]);
  if (!vector || vector.length !== E5_VECTOR_DIMENSIONS || vector.some((value) => !Number.isFinite(value))) {
    throw new Error("Local E5 returned an invalid memory vector.");
  }

  const metadata: Metadata = {
    user_id: ownerId,
    conversation_id: input.conversationId,
    source_user_message_id: input.sourceUserMessageId,
    source_assistant_message_id: input.sourceAssistantMessageId,
    created_at: input.createdAt ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
    model_version: E5_MODEL_VERSION,
    vector_dimensions: E5_VECTOR_DIMENSIONS,
  };

  try {
    const collection = await getCollection();
    await collection.upsert({
      ids: [ownerScopedRecordId(ownerId, input.id)],
      embeddings: [vector],
      metadatas: [metadata],
      documents: [input.content],
    });
  } catch {
    throw wrapStoreError();
  }
}

/** An unavailable store returns no context so callers can continue ordinary chat without memory. */
export async function retrieveConversationMemories(
  userId: string,
  query: string,
  options: { topK?: number; minSimilarity?: number } = {},
): Promise<MemoryRetrievalResult> {
  const ownerId = requireUserId(userId);
  if (typeof query !== "string" || query.trim().length === 0) throw new TypeError("A memory query is required.");
  const topK = options.topK ?? 4;
  if (!Number.isInteger(topK) || topK < 1 || topK > 20) throw new RangeError("Memory topK must be between 1 and 20.");
  if (options.minSimilarity !== undefined && (options.minSimilarity < 0 || options.minSimilarity > 1)) {
    throw new RangeError("Memory similarity threshold must be between 0 and 1.");
  }

  try {
    const queryVector = await embeddings.embedQuery(query);
    if (!queryVector || queryVector.length !== E5_VECTOR_DIMENSIONS) return { available: false, memories: [] };
    const collection = await getCollection();
    const result = await collection.query({
      queryEmbeddings: [queryVector],
      nResults: topK,
      where: { user_id: ownerId },
      include: ["documents", "metadatas", "distances"],
    });

    const documents = result.documents[0] ?? [];
    const metadatas = result.metadatas[0] ?? [];
    const distances = result.distances[0] ?? [];
    const memories = documents.flatMap((content, index): RetrievedConversationMemory[] => {
      const metadata = metadatas[index];
      const distance = distances[index];
      // Defense in depth: reject any result that does not match the authenticated owner filter.
      if (
        typeof content !== "string" ||
        !metadata ||
        metadata.user_id !== ownerId ||
        typeof metadata.conversation_id !== "string" ||
        typeof metadata.created_at !== "string" ||
        typeof distance !== "number" ||
        !Number.isFinite(distance)
      ) {
        return [];
      }
      const similarity = 1 - distance;
      if (options.minSimilarity !== undefined && similarity < options.minSimilarity) return [];
      return [{
        id: result.ids[0]?.[index] ?? "",
        conversationId: metadata.conversation_id,
        content,
        createdAt: metadata.created_at,
        similarity,
      }];
    });
    return { available: true, memories };
  } catch {
    return { available: false, memories: [] };
  }
}

export async function deleteUserConversationMemories(userId: string, conversationId: string): Promise<void> {
  const ownerId = requireUserId(userId);
  if (!conversationId) throw new TypeError("A conversation id is required for memory deletion.");
  try {
    const collection = await getCollection();
    const where: Where = { $and: [{ user_id: ownerId }, { conversation_id: conversationId }] };
    await collection.delete({ where });
  } catch {
    throw wrapStoreError();
  }
}

export async function deleteAllUserConversationMemories(userId: string): Promise<void> {
  const ownerId = requireUserId(userId);
  try {
    const collection = await getCollection();
    await collection.delete({ where: { user_id: ownerId } });
  } catch {
    throw wrapStoreError();
  }
}

export async function chromaHealthCheck(): Promise<{ configured: boolean; healthy: boolean }> {
  const config = serverEnv().chroma;
  if (!config.url || !config.authToken) return { configured: false, healthy: false };
  try {
    await configuredClient().heartbeat();
    return { configured: true, healthy: true };
  } catch {
    return { configured: true, healthy: false };
  }
}
