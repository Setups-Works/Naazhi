import "server-only";
import { ComposioConnectedAccountNotFoundError, ComposioToolExecutionRateLimitError, ConnectionRequestFailedError, ConnectionRequestTimeoutError } from "@composio/core";
import type { ComposioAppId } from "@untitled/types";
import { COMPOSIO_APPS, composioSettingsLabel } from "../../../lib/composio/apps";
import { ConflictError, RateLimitError, ServiceError } from "../../errors";

/** What a person is told when their connection stopped working and only connecting again fixes it. */
export const reconnectMessage = (app: ComposioAppId) =>
  `Your ${COMPOSIO_APPS[app].name} connection needs to be set up again. Reconnect it in ${composioSettingsLabel(app)}.`;

export const notConnectedMessage = (app: ComposioAppId) => `Connect ${COMPOSIO_APPS[app].name} in ${composioSettingsLabel(app)} first.`;

const httpStatus = (e: unknown): number | undefined => {
  const status = (e as { status?: unknown; statusCode?: unknown } | null)?.status ?? (e as { statusCode?: unknown } | null)?.statusCode;
  return typeof status === "number" ? status : undefined;
};

/**
 * Turns whatever the Composio SDK threw into an error a person can act on. Only the error's name is logged: its message can hold
 * parts of a request, and neither tokens nor a person's content may reach the log.
 */
export function toServiceError(e: unknown, app: ComposioAppId): ServiceError {
  if (e instanceof ServiceError) return e;
  const name = COMPOSIO_APPS[app].name;
  const status = httpStatus(e);
  if (e instanceof ComposioToolExecutionRateLimitError || status === 429) return new RateLimitError(`${name} is busy right now. Try again in a minute.`);
  if (e instanceof ComposioConnectedAccountNotFoundError || status === 404) return new ConflictError(reconnectMessage(app));
  if (e instanceof ConnectionRequestTimeoutError || e instanceof ConnectionRequestFailedError)
    return new ConflictError(`${name} didn’t finish connecting. Start again from Settings.`);
  console.error("composio call failed", e instanceof Error ? e.name : "unknown error", status ?? "");
  return new ConflictError(`We couldn’t reach ${name}. Try again in a moment.`);
}
