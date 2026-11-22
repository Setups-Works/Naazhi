import "server-only";
import { userDb } from "../../db/builders";
import { ServiceError } from "../../errors";
import { memoryStoreReady } from "../../repositories/conversation-memory.repository";

export interface UserMemoryPreference {
  enabled: boolean;
  paused: boolean;
  updatedAt: string;
  /** False until this database has the memory table (the pgvector migration): memory can't be switched on before that. */
  available: boolean;
}

/** A database without the memory table must not queue chat text for indexing that will never happen, so memory stays off there. */
async function requireStore(): Promise<void> {
  if (!(await memoryStoreReady())) throw new ServiceError(409, "Memory isn’t available on this server yet.");
}

const DEFAULT_PREFERENCE: Omit<UserMemoryPreference, "available"> = {
  enabled: false,
  paused: false,
  updatedAt: new Date(0).toISOString(),
};

/**
 * Gets the memory preference for the authenticated user.
 * Defaults to disabled (enabled: false, paused: false) if no preference row exists.
 */
export async function getMemoryPreference(userId: string): Promise<UserMemoryPreference> {
  if (!userId) throw new TypeError("Valid user id is required to read memory preferences.");
  const db = userDb(userId);
  const { data, error } = await db
    .from("user_memory_preferences")
    .select("enabled,paused,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  const available = await memoryStoreReady();
  if (error || !data) return { ...DEFAULT_PREFERENCE, available };

  const row = data as { enabled: boolean; paused: boolean; updated_at: string };
  return {
    enabled: Boolean(row.enabled),
    paused: Boolean(row.paused),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    available,
  };
}

/**
 * Returns true only when long-term memory is explicitly enabled AND not paused.
 */
export async function isMemoryActive(userId: string): Promise<boolean> {
  try {
    const pref = await getMemoryPreference(userId);
    return pref.available && pref.enabled && !pref.paused;
  } catch {
    return false;
  }
}

/**
 * Enables AI memory for the authenticated user.
 */
export async function enableMemory(userId: string): Promise<UserMemoryPreference> {
  if (!userId) throw new TypeError("Valid user id is required to enable memory.");
  await requireStore();
  const db = userDb(userId);
  const now = new Date().toISOString();
  const { error } = await db.from("user_memory_preferences").upsert(
    {
      user_id: userId,
      enabled: true,
      paused: false,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error("Failed to enable memory preferences.");
  }
  return { enabled: true, paused: false, updatedAt: now, available: true };
}

/**
 * Pauses AI memory without clearing stored memories.
 */
export async function pauseMemory(userId: string): Promise<UserMemoryPreference> {
  if (!userId) throw new TypeError("Valid user id is required to pause memory.");
  const db = userDb(userId);
  const now = new Date().toISOString();
  const { error } = await db.from("user_memory_preferences").upsert(
    {
      user_id: userId,
      paused: true,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error("Failed to pause memory preferences.");
  }
  return { enabled: true, paused: true, updatedAt: now, available: await memoryStoreReady() };
}

/**
 * Resumes AI memory for an opted-in user.
 */
export async function resumeMemory(userId: string): Promise<UserMemoryPreference> {
  if (!userId) throw new TypeError("Valid user id is required to resume memory.");
  await requireStore();
  const db = userDb(userId);
  const now = new Date().toISOString();
  const { error } = await db.from("user_memory_preferences").upsert(
    {
      user_id: userId,
      enabled: true,
      paused: false,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error("Failed to resume memory preferences.");
  }
  return { enabled: true, paused: false, updatedAt: now, available: true };
}

/**
 * Disables AI memory and resets preference flags.
 */
export async function disableMemory(userId: string): Promise<UserMemoryPreference> {
  if (!userId) throw new TypeError("Valid user id is required to disable memory.");
  const db = userDb(userId);
  const now = new Date().toISOString();
  const { error } = await db.from("user_memory_preferences").upsert(
    {
      user_id: userId,
      enabled: false,
      paused: false,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error("Failed to disable memory preferences.");
  }
  return { enabled: false, paused: false, updatedAt: now, available: await memoryStoreReady() };
}
