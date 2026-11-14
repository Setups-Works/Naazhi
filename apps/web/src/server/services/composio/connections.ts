import "server-only";
import { COMPOSIO_APP_IDS, type ComposioAppId, type ComposioConnectionState, type ComposioStatus } from "@untitled/types";
import { serverEnv } from "../../../config/env";
import { COMPOSIO_APPS, isComposioApp } from "../../../lib/composio/apps";
import { ConflictError, RateLimitError, ValidationError } from "../../errors";
import { underLimit } from "../../rateLimit";
import * as repo from "../../repositories/composioConnections.repository";
import { appAvailable, authConfigId, composio, composioConfigured } from "./client";
import { toServiceError } from "./errors";
import { field, str } from "./json";
import { runTool } from "./tools";

/**
 * Connecting and disconnecting an app through Composio.
 * - The person signs in on the app's own page (Google's), so Naazhi never sees a password, and Composio keeps the tokens: we store
 *   only the connection's id, its state and the account's name.
 * - A connection always belongs to the person who started it: it is created under their Naazhi user id and looked up again by that
 *   id when they come back, so nothing in the return address is trusted.
 * - One account per app. Connecting another account means disconnecting the first.
 */
const CONNECTS_PER_TEN_MINUTES = 10;
const WAIT_FOR_SIGN_IN_MS = 15_000;

/** Where Composio sends the person after the sign-in. */
export const callbackUrl = (app: ComposioAppId) => `${serverEnv().authUrl.replace(/\/+$/, "")}/api/v1/integrations/composio/callback?app=${app}`;

/** Composio's own words for a connection's state, in ours. */
export function connectionState(composioStatus: string): ComposioConnectionState {
  if (composioStatus === "ACTIVE") return "connected";
  if (composioStatus === "INITIALIZING" || composioStatus === "INITIATED") return "pending";
  return composioStatus === "EXPIRED" ? "expired" : "error";
}

export function asComposioApp(app: string | null | undefined): ComposioAppId {
  if (!isComposioApp(app)) throw new ValidationError("That isn’t an app Naazhi can connect.");
  return app;
}

/** Which apps can be connected on this server and which ones the person has connected. Never returns a connection id or a token. */
export async function composioStatus(userId: string): Promise<ComposioStatus> {
  const rows = await repo.listConnections(userId);
  return {
    configured: composioConfigured(),
    apps: COMPOSIO_APP_IDS.map((app) => {
      const row = rows.find((r) => r.app === app);
      return { app, available: appAvailable(app), state: row?.status ?? null, account: row?.label || null };
    }),
  };
}

/** Asks Composio to forget a connection. Best effort: our own record is removed either way, and the grant can also be removed in the person's Google account. */
async function forgetAtComposio(connectionId: string): Promise<void> {
  if (!composioConfigured()) return;
  try {
    await composio().connectedAccounts.delete(connectionId);
  } catch {
    /* already gone, or Composio is unreachable */
  }
}

/** Step 1: the address of the app's own sign-in page, where the person approves access. */
export async function startComposioConnect(userId: string, app: ComposioAppId): Promise<string> {
  const name = COMPOSIO_APPS[app].name;
  const authConfig = authConfigId(app);
  if (!(await underLimit(`composio-connect:${userId}`, CONNECTS_PER_TEN_MINUTES, 600))) throw new RateLimitError();
  const existing = await repo.getConnection(userId, app);
  if (existing?.status === "connected") throw new ConflictError(`${name} is already connected. Disconnect it first to connect another account.`);
  // An unfinished sign-in or a connection that stopped working is replaced, so Composio never keeps a leftover for this person.
  if (existing) await forgetAtComposio(existing.connection_id);
  let request: Awaited<ReturnType<ReturnType<typeof composio>["connectedAccounts"]["link"]>>;
  try {
    request = await composio().connectedAccounts.link(userId, authConfig, { callbackUrl: callbackUrl(app) });
  } catch (e) {
    throw toServiceError(e, app);
  }
  if (!request.redirectUrl) throw new ConflictError(`${name} didn’t give us a sign-in page. Try again in a moment.`);
  await repo.saveConnection(userId, { app, connection_id: request.id, status: "pending", label: "" });
  return request.redirectUrl;
}

/**
 * The connected account as the person knows it, shown in Settings. Best effort: when the app doesn't say, the label stays empty
 * and Settings shows the app's name.
 */
const ACCOUNT_LABEL: Record<ComposioAppId, { tool: string; args: Record<string, unknown>; key: string }> = {
  gmail: { tool: "GMAIL_GET_PROFILE", args: { user_id: "me" }, key: "emailAddress" },
  // The main calendar is named after the account's email address.
  googlecalendar: { tool: "GOOGLECALENDAR_EVENTS_LIST", args: { calendarId: "primary", maxResults: 1 }, key: "summary" },
};

async function accountLabel(userId: string, app: ComposioAppId, connectionId: string): Promise<string> {
  const { tool, args, key } = ACCOUNT_LABEL[app];
  try {
    return str(field(await runTool({ userId, app, connectionId, tool, args }), key)).slice(0, 200);
  } catch {
    return "";
  }
}

/** Step 2: the person came back from the sign-in. Confirm with Composio that it worked, then mark the connection as connected. */
export async function finishComposioConnect(userId: string, app: ComposioAppId): Promise<void> {
  const def = COMPOSIO_APPS[app];
  const row = await repo.getConnection(userId, app);
  if (!row) throw new ValidationError("That sign-in link expired or was already used. Start again from Settings.");
  if (row.status === "connected") return; // the page was opened twice
  let account: Awaited<ReturnType<ReturnType<typeof composio>["connectedAccounts"]["waitForConnection"]>>;
  try {
    // Composio usually has the connection ready before it sends the person back; this waits briefly when it is a moment behind.
    account = await composio().connectedAccounts.waitForConnection(row.connection_id, WAIT_FOR_SIGN_IN_MS);
  } catch (e) {
    await repo.setConnectionStatus(userId, app, "error");
    throw toServiceError(e, app);
  }
  if (account.toolkit.slug.toLowerCase() !== def.toolkit || connectionState(account.status) !== "connected") {
    await repo.setConnectionStatus(userId, app, "error");
    throw new ConflictError(`${def.name} didn’t finish connecting. Start again from Settings.`);
  }
  await repo.saveConnection(userId, { app, connection_id: row.connection_id, status: "connected", label: await accountLabel(userId, app, row.connection_id) });
}

/** Removes the connection here and at Composio (which gives up its tokens). */
export async function disconnectComposio(userId: string, app: ComposioAppId): Promise<void> {
  const row = await repo.getConnection(userId, app);
  if (!row) return;
  await forgetAtComposio(row.connection_id);
  await repo.deleteConnection(userId, app);
}
