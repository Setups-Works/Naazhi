import "server-only";
import type { ComposioAppId } from "@untitled/types";
import { COMPOSIO_APPS, composioSettingsLabel } from "../../../lib/composio/apps";
import { ConflictError, RateLimitError } from "../../errors";
import { underLimit } from "../../rateLimit";
import * as repo from "../../repositories/integrations.repository";
import { accessToken } from "./google";
import type { J } from "./json";

/**
 * One call to a Google API as one person. Every call uses that person's own token, so it can only reach the account they connected.
 * Answers and request bodies are never logged: they hold the person's mail, calendar and files.
 */
const CALLS_PER_MINUTE = 60;
const TIMEOUT_MS = 20_000;

const reconnect = (app: ComposioAppId) => `Your ${COMPOSIO_APPS[app].name} connection needs to be set up again. Reconnect it in ${composioSettingsLabel(app)}.`;

export async function googleApi(userId: string, app: ComposioAppId, url: string, init: { method?: "GET" | "POST"; body?: J } = {}): Promise<J> {
  const name = COMPOSIO_APPS[app].name;
  const access = await accessToken(userId);
  if (!access || !access.apps.includes(app)) throw new ConflictError(`Connect ${name} in ${composioSettingsLabel(app)} first.`);
  if (!(await underLimit(`google:${userId}`, CALLS_PER_MINUTE, 60))) throw new RateLimitError();
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? "GET",
      headers: { authorization: `Bearer ${access.token}`, ...(init.body ? { "content-type": "application/json" } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new ConflictError(`We couldn’t reach ${name}. Try again in a moment.`);
  }
  if (res.status === 401) {
    await repo.deleteIntegration(userId, "google");
    throw new ConflictError(reconnect(app));
  }
  if (res.status === 429) throw new RateLimitError(`${name} is busy right now. Try again in a minute.`);
  if (res.status === 403) throw new ConflictError(`${name} didn’t allow that. Reconnect it in ${composioSettingsLabel(app)} and keep every box ticked.`);
  if (!res.ok) throw new ConflictError(`${name} couldn’t do that.`);
  const json = (await res.json().catch(() => ({}))) as unknown;
  return json && typeof json === "object" && !Array.isArray(json) ? (json as J) : {};
}
