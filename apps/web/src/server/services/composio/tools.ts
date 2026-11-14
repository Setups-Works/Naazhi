import "server-only";
import type { ComposioAppId } from "@untitled/types";
import { COMPOSIO_APPS } from "../../../lib/composio/apps";
import { ConflictError, RateLimitError, ValidationError } from "../../errors";
import { underLimit } from "../../rateLimit";
import * as repo from "../../repositories/composioConnections.repository";
import { composio, toolkitVersion } from "./client";
import { notConnectedMessage, reconnectMessage, toServiceError } from "./errors";
import type { J } from "./json";

/**
 * Runs one Composio tool (GMAIL_FETCH_EMAILS, GOOGLECALENDAR_CREATE_EVENT…) as one person. Every call names that person's Naazhi
 * user id and their own connection, so a call can only ever read or change the account they connected themselves.
 * Arguments and answers are never logged: they hold the person's email and calendar.
 */
const CALLS_PER_MINUTE = 60;
const TIMEOUT_MS = 20_000;

/** A failed tool whose reason is the connection itself (a revoked or expired grant), not the request. */
const AUTH_FAILURE = /\b(401|unauthori[sz]ed|invalid_grant|revoked)\b|token (has |is )?expired/i;

/** The id of the person's working connection to an app. Anything else is refused with a message that says what to do. */
async function connectedAccountId(userId: string, app: ComposioAppId): Promise<string> {
  const row = await repo.getConnection(userId, app);
  if (!row || row.status === "pending") throw new ConflictError(notConnectedMessage(app));
  if (row.status !== "connected") throw new ConflictError(reconnectMessage(app));
  return row.connection_id;
}

/**
 * Runs a tool on a known connection. Used directly only while a connection is being set up (it is not `connected` yet);
 * everything else calls `executeTool`.
 */
export async function runTool(p: { userId: string; app: ComposioAppId; connectionId: string; tool: string; args?: J }): Promise<J> {
  const def = COMPOSIO_APPS[p.app];
  // A tool always belongs to the app whose connection it uses, so a Gmail connection can never be asked to run another app's tool.
  if (!p.tool.startsWith(`${def.toolkit.toUpperCase()}_`)) throw new ValidationError(`That isn’t something ${def.name} can do.`);
  const version = toolkitVersion(p.app);
  let result: Awaited<ReturnType<ReturnType<typeof composio>["tools"]["execute"]>>;
  try {
    result = await composio().tools.execute(
      p.tool,
      {
        userId: p.userId,
        connectedAccountId: p.connectionId,
        arguments: p.args ?? {},
        // Composio wants a fixed version of an app's tools so an update can't change behaviour unnoticed. An admin pins one with
        // COMPOSIO_TOOLKIT_VERSION_<APP>; until then the newest version is used.
        ...(version ? { version } : { dangerouslySkipVersionCheck: true }),
      },
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
  } catch (e) {
    throw toServiceError(e, p.app);
  }
  if (result.successful) return result.data;
  const reason = (result.error ?? "").slice(0, 160);
  if (AUTH_FAILURE.test(reason)) {
    await repo.setConnectionStatus(p.userId, p.app, "expired");
    throw new ConflictError(reconnectMessage(p.app));
  }
  throw new ConflictError(reason ? `${def.name} couldn’t do that: ${reason}` : `${def.name} couldn’t do that.`);
}

/** Runs a tool with the person's own connection to the app. This is the function the rest of the server uses. */
export async function executeTool(userId: string, app: ComposioAppId, tool: string, args: J = {}): Promise<J> {
  const connectionId = await connectedAccountId(userId, app);
  if (!(await underLimit(`composio:${userId}`, CALLS_PER_MINUTE, 60))) throw new RateLimitError();
  return runTool({ userId, app, connectionId, tool, args });
}
