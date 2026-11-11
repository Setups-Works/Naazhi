import "server-only";
import { withOwner } from "../db/pool";

/**
 * Data access for the model picker's connections (own keys and the ChatGPT sign-in) and a sign-in in progress. Owner-level on purpose:
 * the browser role has no access to these tables at all, so everything goes through the connections service, which has checked the
 * person first. Secrets arrive already sealed and are never logged.
 */
export type ConnectionRow = {
  provider: string;
  kind: "key" | "oauth";
  secret_cipher: string;
  key_hint: string;
  meta: Record<string, unknown>;
  updated_at: string;
};

export const listConnections = (userId: string) =>
  withOwner(
    async (c) =>
      (await c.query<ConnectionRow>("select provider, kind, secret_cipher, key_hint, meta, updated_at from public.user_ai_connections where user_id = $1", [userId])).rows,
  );

export const getConnection = (userId: string, provider: string) =>
  withOwner(
    async (c) =>
      (await c.query<ConnectionRow>(
        "select provider, kind, secret_cipher, key_hint, meta, updated_at from public.user_ai_connections where user_id = $1 and provider = $2",
        [userId, provider],
      )).rows[0] ?? null,
  );

export const saveConnection = (userId: string, row: { provider: string; kind: "key" | "oauth"; secret_cipher: string; key_hint: string; meta?: Record<string, unknown> }) =>
  withOwner(
    async (c) =>
      void (await c.query(
        `insert into public.user_ai_connections (user_id, provider, kind, secret_cipher, key_hint, meta) values ($1, $2, $3, $4, $5, $6)
         on conflict (user_id, provider) do update set kind = excluded.kind, secret_cipher = excluded.secret_cipher,
           key_hint = excluded.key_hint, meta = excluded.meta, updated_at = now()`,
        [userId, row.provider, row.kind, row.secret_cipher, row.key_hint, JSON.stringify(row.meta ?? {})],
      )),
  );

export const deleteConnection = (userId: string, provider: string) =>
  withOwner(async (c) => void (await c.query("delete from public.user_ai_connections where user_id = $1 and provider = $2", [userId, provider])));

export type DeviceLogin = { device_auth_id: string; user_code: string; interval_s: number; expires_at: string };

export const getDeviceLogin = (userId: string) =>
  withOwner(
    async (c) =>
      (await c.query<DeviceLogin>(
        "select device_auth_id, user_code, interval_s, expires_at from public.ai_device_logins where user_id = $1 and expires_at > now()",
        [userId],
      )).rows[0] ?? null,
  );

export const saveDeviceLogin = (userId: string, d: { device_auth_id: string; user_code: string; interval_s: number; expires_in_s: number }) =>
  withOwner(
    async (c) =>
      void (await c.query(
        `insert into public.ai_device_logins (user_id, device_auth_id, user_code, interval_s, expires_at)
         values ($1, $2, $3, $4, now() + make_interval(secs => $5))
         on conflict (user_id) do update set device_auth_id = excluded.device_auth_id, user_code = excluded.user_code,
           interval_s = excluded.interval_s, expires_at = excluded.expires_at, created_at = now()`,
        [userId, d.device_auth_id, d.user_code, d.interval_s, d.expires_in_s],
      )),
  );

export const deleteDeviceLogin = (userId: string) => withOwner(async (c) => void (await c.query("delete from public.ai_device_logins where user_id = $1", [userId])));
