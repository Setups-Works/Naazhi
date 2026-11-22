import "server-only";
import { createHash } from "node:crypto";
import { pool } from "../../db/pool";
import { upsertConversationMemory } from "../../repositories/conversation-memory.repository";
import { isMemoryActive } from "./memory-preferences.service";
import { MEMORY_CONFIG } from "./memory-config";

export interface OutboxItem {
  id: string;
  userId: string;
  chatId: string;
  userMessageId?: string;
  assistantMessageId?: string;
  userText: string;
  assistantText: string;
  attempts: number;
}

/**
 * Deterministic memory ID derived from the user id, conversation id, and user message id/timestamp.
 * Ensures idempotency across repeated index attempts.
 */
export function deriveDeterministicMemoryId(userId: string, chatId: string, sourceUserMessageId: string): string {
  return createHash("sha256")
    .update(userId)
    .update(":")
    .update(chatId)
    .update(":")
    .update(sourceUserMessageId)
    .digest("hex");
}

/**
 * Enqueues a completed conversation turn into the PostgreSQL outbox for background indexing.
 * Does not block chat streaming. If memory is disabled or enqueuing fails, it degrades silently.
 */
export async function scheduleMemoryTurnIndexing(opts: {
  userId: string;
  chatId: string;
  userMessageId?: string;
  assistantMessageId?: string;
  userText: string;
  assistantText: string;
}): Promise<void> {
  try {
    const active = await isMemoryActive(opts.userId);
    if (!active) return; // Opt-in only

    const uText = opts.userText.trim().slice(0, MEMORY_CONFIG.maxChunkChars);
    const aText = opts.assistantText.trim().slice(0, MEMORY_CONFIG.maxChunkChars);
    if (!uText && !aText) return;

    await pool().query(
      `insert into public.memory_indexing_outbox
       (user_id, chat_id, user_message_id, assistant_message_id, user_text, assistant_text, status)
       values ($1, $2, $3, $4, $5, $6, 'pending')`,
      [
        opts.userId,
        opts.chatId,
        opts.userMessageId || null,
        opts.assistantMessageId || null,
        uText,
        aText,
      ],
    );
  } catch (error) {
    // Fire-and-forget: do not block or throw on background queue errors
    console.error("Failed to enqueue conversation turn into memory outbox:", error instanceof Error ? error.message : error);
  }
}

/**
 * Processes up to `limit` pending conversation turns from the outbox.
 * Designed to be called by a background cron job or scheduled worker.
 */
export async function processMemoryOutbox(limit = 10): Promise<{ processed: number; succeeded: number; failed: number }> {
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  // Claim pending outbox items atomically
  const { rows } = await pool().query<{
    id: string;
    user_id: string;
    chat_id: string;
    user_message_id: string | null;
    assistant_message_id: string | null;
    user_text: string;
    assistant_text: string;
    attempts: number;
  }>(
    `update public.memory_indexing_outbox
     set status = 'processing', attempts = attempts + 1
     where id in (
       select id from public.memory_indexing_outbox
       where status = 'pending' and attempts < $1
       order by created_at asc
       limit $2
       for update skip locked
     )
     returning id, user_id, chat_id, user_message_id, assistant_message_id, user_text, assistant_text, attempts`,
    [MEMORY_CONFIG.maxOutboxAttempts, limit],
  );

  if (!rows.length) return { processed: 0, succeeded: 0, failed: 0 };

  for (const item of rows) {
    processed++;
    try {
      // Re-verify user memory status at index time
      const active = await isMemoryActive(item.user_id);
      if (!active) {
        // User opted out or paused since turn occurred: discard without indexing
        await pool().query(
          `update public.memory_indexing_outbox
           set status = 'done', processed_at = now()
           where id = $1`,
          [item.id],
        );
        succeeded++;
        continue;
      }

      const sourceId = item.user_message_id || item.id;
      const memId = deriveDeterministicMemoryId(item.user_id, item.chat_id, sourceId);

      // Create bounded summary chunk of the exchange
      const memoryContent = `User: ${item.user_text}\nAssistant: ${item.assistant_text}`.slice(
        0,
        MEMORY_CONFIG.maxChunkChars,
      );

      await upsertConversationMemory(item.user_id, {
        id: memId,
        conversationId: item.chat_id,
        sourceUserMessageId: item.user_message_id || "turn-user",
        sourceAssistantMessageId: item.assistant_message_id || "turn-asst",
        content: memoryContent,
      });

      await pool().query(
        `update public.memory_indexing_outbox
         set status = 'done', processed_at = now()
         where id = $1`,
        [item.id],
      );
      succeeded++;
    } catch (err) {
      // The chat was deleted before its turn was indexed: there is nothing to remember, and retrying can't help.
      if ((err as { code?: unknown } | null)?.code === "23503") {
        await pool().query(`update public.memory_indexing_outbox set status = 'done', processed_at = now() where id = $1`, [item.id]);
        succeeded++;
        continue;
      }
      failed++;
      const errorMessage = err instanceof Error ? err.message : String(err);
      const isFinalAttempt = item.attempts >= MEMORY_CONFIG.maxOutboxAttempts;

      await pool().query(
        `update public.memory_indexing_outbox
         set status = $1, last_error = $2, processed_at = case when $1 = 'failed' then now() else null end
         where id = $3`,
        [isFinalAttempt ? "failed" : "pending", errorMessage.slice(0, 500), item.id],
      );
    }
  }

  return { processed, succeeded, failed };
}
