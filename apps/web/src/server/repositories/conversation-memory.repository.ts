import "server-only";

import { createHash } from "node:crypto";
import { pool, withUser } from "../db/pool";
import { LocalE5Embeddings, E5_MODEL_VERSION, E5_VECTOR_DIMENSIONS } from "../providers/embeddings/localE5";

const embeddings = new LocalE5Embeddings();
const MAX_CONTENT_CHARS = 4000;

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

export class MemoryStoreUnavailableError extends Error {
  constructor() {
    super("The semantic memory store is unavailable.");
    this.name = "MemoryStoreUnavailableError";
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireUserId(userId: string): string {
  if (typeof userId !== "string" || !UUID.test(userId)) {
    throw new TypeError("A valid authenticated user id is required for memory access.");
  }
  return userId;
}

function validateMemory(input: ConversationMemoryInput): void {
  if (!input.id || !input.sourceUserMessageId || !input.sourceAssistantMessageId) {
    throw new TypeError("Memory ids and source message ids are required.");
  }
  if (typeof input.conversationId !== "string" || !UUID.test(input.conversationId)) {
    throw new TypeError("A valid conversation id is required.");
  }
  if (typeof input.content !== "string" || input.content.trim().length === 0) {
    throw new TypeError("Memory content must not be empty.");
  }
}

function ownerScopedRecordId(userId: string, recordId: string): string {
  return createHash("sha256").update(userId).update("\0").update(recordId).digest("hex");
}

/** pgvector's text form: `[0.1,0.2,…]`. Only finite numbers of the right count get here. */
export function toVectorLiteral(vector: number[]): string {
  if (vector.length !== E5_VECTOR_DIMENSIONS || vector.some((value) => !Number.isFinite(value))) {
    throw new Error("Local E5 returned an invalid memory vector.");
  }
  return `[${vector.join(",")}]`;
}

let ready: { value: boolean; at: number } | undefined;

/**
 * True once the `conversation_memories` migration (and so pgvector) is in this database. Cached: a "yes" for the life of the process,
 * a "no" for a minute, so applying the migration switches memory on without a restart.
 */
export async function memoryStoreReady(): Promise<boolean> {
  if (ready && (ready.value || Date.now() - ready.at < 60_000)) return ready.value;
  try {
    const { rows } = await pool().query<{ ok: boolean }>("select to_regclass('public.conversation_memories') is not null as ok");
    ready = { value: Boolean(rows[0]?.ok), at: Date.now() };
  } catch {
    ready = { value: false, at: Date.now() };
  }
  return ready.value;
}

/** Runs as the signed-in person, so Row-Level Security applies; the explicit user_id filters are defence in depth. */
export async function upsertConversationMemory(userId: string, input: ConversationMemoryInput): Promise<void> {
  const ownerId = requireUserId(userId);
  validateMemory(input);

  const [vector] = await embeddings.embedDocuments([input.content]);
  if (!vector) throw new Error("Local E5 did not return a memory vector.");
  const literal = toVectorLiteral(vector);

  await withUser(ownerId, (c) =>
    c.query(
      `insert into public.conversation_memories
         (id, user_id, chat_id, source_user_message_id, source_assistant_message_id, content, embedding, model_version, created_at)
       values ($1, $2, $3, $4, $5, $6, $7::vector, $8, coalesce($9::timestamptz, now()))
       on conflict (id) do update set
         content = excluded.content,
         embedding = excluded.embedding,
         model_version = excluded.model_version,
         source_assistant_message_id = excluded.source_assistant_message_id,
         updated_at = now()`,
      [
        ownerScopedRecordId(ownerId, input.id),
        ownerId,
        input.conversationId,
        input.sourceUserMessageId,
        input.sourceAssistantMessageId,
        input.content.slice(0, MAX_CONTENT_CHARS),
        literal,
        E5_MODEL_VERSION,
        input.createdAt ?? null,
      ],
    ),
  );
}

/** An unavailable store (no migration, model not loading, database hiccup) returns no context so chat carries on without memory. */
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
    if (!(await memoryStoreReady())) return { available: false, memories: [] };
    const literal = toVectorLiteral(await embeddings.embedQuery(query));
    const { rows } = await withUser(ownerId, (c) =>
      c.query<{ id: string; chat_id: string; content: string; created_at: string; similarity: number }>(
        `select id, chat_id, content, created_at, 1 - (embedding <=> $2::vector) as similarity
           from public.conversation_memories
          where user_id = $1 and model_version = $4
          order by embedding <=> $2::vector
          limit $3`,
        [ownerId, literal, topK, E5_MODEL_VERSION],
      ),
    );
    const memories = rows.flatMap((row): RetrievedConversationMemory[] => {
      const similarity = Number(row.similarity);
      if (!Number.isFinite(similarity)) return [];
      if (options.minSimilarity !== undefined && similarity < options.minSimilarity) return [];
      return [{ id: row.id, conversationId: row.chat_id, content: row.content, createdAt: String(row.created_at), similarity }];
    });
    return { available: true, memories };
  } catch {
    return { available: false, memories: [] };
  }
}

export async function deleteUserConversationMemories(userId: string, conversationId: string): Promise<void> {
  const ownerId = requireUserId(userId);
  if (typeof conversationId !== "string" || !UUID.test(conversationId)) {
    throw new TypeError("A valid conversation id is required for memory deletion.");
  }
  if (!(await memoryStoreReady())) return;
  try {
    await withUser(ownerId, (c) =>
      c.query("delete from public.conversation_memories where user_id = $1 and chat_id = $2", [ownerId, conversationId]),
    );
  } catch {
    throw new MemoryStoreUnavailableError();
  }
}

export async function deleteAllUserConversationMemories(userId: string): Promise<void> {
  const ownerId = requireUserId(userId);
  if (!(await memoryStoreReady())) return;
  try {
    await withUser(ownerId, (c) => c.query("delete from public.conversation_memories where user_id = $1", [ownerId]));
  } catch {
    throw new MemoryStoreUnavailableError();
  }
}
