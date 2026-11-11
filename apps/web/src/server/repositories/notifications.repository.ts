import "server-only";
import type { AppNotification } from "@untitled/logic";
import { withOwner, withUser } from "../db/pool";

/** Data access for push devices and the notification inbox. People's own calls run as them (RLS); sending runs as the owner. */

export type NotificationRow = AppNotification;
export type NewNotification = { kind: NotificationRow["kind"]; title: string; body: string; url?: string | null };

export const saveDevice = (userId: string, token: string, platform: "android" | "ios") =>
  withOwner(async (c) => {
    // A phone that signs in as someone else takes its token with it.
    await c.query(
      `insert into public.push_devices (user_id, token, platform) values ($1, $2, $3)
       on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, last_seen_at = now()`,
      [userId, token, platform],
    );
  });

export const removeDevice = (userId: string, token: string) =>
  withUser(userId, async (c) => void (await c.query("delete from public.push_devices where token = $1", [token])));

export const deleteTokens = (tokens: string[]) =>
  tokens.length ? withOwner(async (c) => void (await c.query("delete from public.push_devices where token = any($1)", [tokens]))) : Promise.resolve();

export const tokensFor = (userIds: string[]) =>
  withOwner(async (c) => (await c.query<{ token: string; platform: string }>("select token, platform from public.push_devices where user_id = any($1)", [userIds])).rows);

/** Writes one notification per user. Returns how many were written. */
export const insertFor = (userIds: string[], n: NewNotification) =>
  withOwner(async (c) => {
    const r = await c.query(
      // Every placeholder is typed: Postgres cannot work out the type of a bare $n in a select list, and the insert fails.
      `insert into public.notifications (user_id, kind, title, body, url) select unnest($1::uuid[]), $2::text, $3::text, $4::text, $5::text`,
      [userIds, n.kind, n.title, n.body, n.url ?? null],
    );
    return r.rowCount ?? 0;
  });

/** Every user's id (for a message to everyone). */
export const allUserIds = () => withOwner(async (c) => (await c.query<{ id: string }>("select id from auth.users")).rows.map((r) => r.id));

export const userIdByEmail = (email: string) =>
  withOwner(async (c) => (await c.query<{ id: string }>("select id from auth.users where lower(email) = lower($1)", [email])).rows[0]?.id ?? null);

export const list = (userId: string, limit: number) =>
  withUser(userId, async (c) =>
    (await c.query<NotificationRow>("select id, kind, title, body, url, read_at, created_at from public.notifications order by created_at desc limit $1", [limit])).rows,
  );

export const unreadCount = (userId: string) =>
  withUser(userId, async (c) => (await c.query<{ n: number }>("select count(*)::int as n from public.notifications where read_at is null")).rows[0]!.n);

export const markRead = (userId: string, id: string | null) =>
  withUser(userId, async (c) => {
    await c.query(`update public.notifications set read_at = now() where read_at is null and ($1::uuid is null or id = $1)`, [id]);
  });

export const remove = (userId: string, id: string) => withUser(userId, async (c) => void (await c.query("delete from public.notifications where id = $1", [id])));

/** Whether this person already got a notification of this kind lately (to keep automatic ones from piling up). */
export const recentOfKind = (userId: string, kind: NotificationRow["kind"], withinMinutes: number) =>
  withUser(userId, async (c) =>
    ((await c.query("select 1 from public.notifications where kind = $1 and created_at > now() - make_interval(mins => $2) limit 1", [kind, withinMinutes])).rowCount ?? 0) > 0,
  );

/** People with a registered phone and at least one feed: the ones the hourly Reader check is for. */
export const usersForReaderNews = (limit: number) =>
  withOwner(async (c) =>
    (await c.query<{ user_id: string }>(
      `select distinct d.user_id from public.push_devices d where exists (select 1 from public.rss_feeds f where f.user_id = d.user_id) limit $1`,
      [limit],
    )).rows.map((r) => r.user_id),
  );
