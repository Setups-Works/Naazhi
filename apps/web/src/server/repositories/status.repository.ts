import "server-only";
import { pool } from "../db/pool";
import { redis } from "../redis";

/** Data access for the public status page: the cheapest possible round trip to each backing service. Nothing here reads user data. */
export async function pingDatabase(): Promise<void> {
  await pool().query("select 1");
}

/** Resolves false when Redis is not configured (so it is not reported at all); throws when it is configured but unreachable. */
export async function pingCache(): Promise<boolean> {
  const r = redis();
  if (!r) return false;
  await r.ping();
  return true;
}
