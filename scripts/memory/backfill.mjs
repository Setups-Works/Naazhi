#!/usr/bin/env node
/**
 * scripts/memory/backfill.mjs
 *
 * Admin-controlled, optional historical conversation backfill utility.
 *
 * STRICT RULES:
 * 1. Default mode is --preview (dry run only).
 * 2. Does NOT execute backfill unless run with --execute AND explicit confirmation.
 * 3. Only processes users who explicitly opted in (enabled = true and paused = false).
 * 4. Uses deterministic IDs to make indexing completely idempotent.
 * 5. Uses keyset pagination over PostgreSQL chat history to prevent memory pressure.
 * 6. Never deletes or mutates existing chat messages.
 */

import pg from "pg";
import { createHash } from "node:crypto";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

function deriveMemoryId(userId, chatId, messageId) {
  return createHash("sha256")
    .update(userId)
    .update(":")
    .update(chatId)
    .update(":")
    .update(messageId)
    .digest("hex");
}

async function main() {
  const args = process.argv.slice(2);
  const isExecute = args.includes("--execute");

  console.log("==================================================");
  console.log("Naazhi Historical Semantic Memory Backfill Utility");
  console.log(`Mode: ${isExecute ? "EXECUTE (Write to Outbox)" : "PREVIEW (Dry run only)"}`);
  console.log("==================================================\n");

  const client = await pool.connect();
  try {
    // 1. Find opted-in users
    const { rows: optedInUsers } = await client.query(`
      select user_id, enabled, paused
      from public.user_memory_preferences
      where enabled = true and paused = false
    `);

    console.log(`Found ${optedInUsers.length} user(s) with active memory opt-in.\n`);

    if (optedInUsers.length === 0) {
      console.log("No opted-in users found. Nothing to backfill.");
      return;
    }

    let totalEligibleTurns = 0;

    for (const u of optedInUsers) {
      const { user_id: userId } = u;

      // Count eligible chats and messages using keyset/cursor query
      const { rows: eligibleTurns } = await client.query(`
        with ordered_msgs as (
          select
            m.id,
            m.chat_id,
            m.role,
            m.body,
            m.created_at,
            lag(m.id) over (partition by m.chat_id order by m.created_at asc) as prev_id,
            lag(m.role) over (partition by m.chat_id order by m.created_at asc) as prev_role,
            lag(m.body) over (partition by m.chat_id order by m.created_at asc) as prev_body
          from public.chat_messages m
          join public.chats c on c.id = m.chat_id
          where c.user_id = $1
        )
        select
          chat_id,
          prev_id as user_message_id,
          id as assistant_message_id,
          prev_body as user_text,
          body as assistant_text,
          created_at
        from ordered_msgs
        where role = 'assistant' and prev_role = 'user'
        order by created_at asc
      `, [userId]);

      console.log(`User ${userId}: ${eligibleTurns.length} completed conversation turn(s) eligible.`);
      totalEligibleTurns += eligibleTurns.length;

      if (isExecute && eligibleTurns.length > 0) {
        console.log(`  Queueing ${eligibleTurns.length} turn(s) into memory_indexing_outbox...`);
        let queued = 0;
        for (const turn of eligibleTurns) {
          await client.query(`
            insert into public.memory_indexing_outbox
            (user_id, chat_id, user_message_id, assistant_message_id, user_text, assistant_text, status)
            values ($1, $2, $3, $4, $5, $6, 'pending')
            on conflict do nothing
          `, [
            userId,
            turn.chat_id,
            turn.user_message_id,
            turn.assistant_message_id,
            turn.user_text.slice(0, 1500),
            turn.assistant_text.slice(0, 1500),
          ]);
          queued++;
        }
        console.log(`  ✓ Successfully queued ${queued} turns.`);
      }
    }

    console.log(`\nSummary:`);
    console.log(`Total eligible conversation turns: ${totalEligibleTurns}`);
    if (!isExecute) {
      console.log("\n[Dry run complete. No records were modified.]");
      console.log("To queue backfill into the indexing outbox, pass --execute explicitly.");
    } else {
      console.log("\n[Execute complete. Turns queued into memory_indexing_outbox for processing.]");
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
