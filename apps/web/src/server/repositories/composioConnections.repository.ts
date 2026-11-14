import "server-only";
import type { ComposioConnectionState } from "@untitled/types";
import { withOwner } from "../db/pool";

/**
 * Data access for connections made through Composio and the events its webhook delivers. Owner-level on purpose: the browser role
 * has no access to these tables, so everything goes through the composio service, which has checked the person first. No secret is
 * stored: Composio holds the tokens and we keep only the connection's id.
 */
export type ConnectionRow = {
  app: string;
  connection_id: string;
  status: ComposioConnectionState;
  label: string;
};

const COLS = "app, connection_id, status, label";

export const listConnections = (userId: string) =>
  withOwner(async (c) => (await c.query<ConnectionRow>(`select ${COLS} from public.integration_connections where user_id = $1 order by app`, [userId])).rows);

export const getConnection = (userId: string, app: string) =>
  withOwner(
    async (c) => (await c.query<ConnectionRow>(`select ${COLS} from public.integration_connections where user_id = $1 and app = $2`, [userId, app])).rows[0] ?? null,
  );

/** Adds the person's connection to an app, or replaces the one they had. */
export const saveConnection = (userId: string, row: ConnectionRow) =>
  withOwner(
    async (c) =>
      void (await c.query(
        `insert into public.integration_connections (user_id, app, connection_id, status, label) values ($1, $2, $3, $4, $5)
         on conflict (user_id, app) do update set connection_id = excluded.connection_id, status = excluded.status,
           label = excluded.label, updated_at = now()`,
        [userId, row.app, row.connection_id, row.status, row.label],
      )),
  );

export const setConnectionStatus = (userId: string, app: string, status: ComposioConnectionState) =>
  withOwner(
    async (c) =>
      void (await c.query("update public.integration_connections set status = $3, updated_at = now() where user_id = $1 and app = $2", [userId, app, status])),
  );

export const deleteConnection = (userId: string, app: string) =>
  withOwner(async (c) => void (await c.query("delete from public.integration_connections where user_id = $1 and app = $2", [userId, app])));

/** Whose connection this is, for an incoming webhook that only names the connection. */
export const findConnectionOwner = (connectionId: string) =>
  withOwner(
    async (c) =>
      (await c.query<{ user_id: string; app: string }>("select user_id, app from public.integration_connections where connection_id = $1", [connectionId])).rows[0] ??
      null,
  );

/** Records a webhook event once. False when the same event was delivered before. */
export const recordEvent = (event: { id: string; userId: string; app: string; trigger: string }) =>
  withOwner(
    async (c) =>
      (
        await c.query(
          "insert into public.integration_events (event_id, user_id, app, trigger) values ($1, $2, $3, $4) on conflict (event_id) do nothing",
          [event.id, event.userId, event.app, event.trigger],
        )
      ).rowCount === 1,
  );
