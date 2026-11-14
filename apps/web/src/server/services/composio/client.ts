import "server-only";
import { Composio } from "@composio/core";
import type { ComposioAppId } from "@untitled/types";
import { serverEnv } from "../../../config/env";
import { COMPOSIO_APPS } from "../../../lib/composio/apps";
import { ConflictError } from "../../errors";

/**
 * The one place that holds the Composio SDK and its settings. One project API key (COMPOSIO_API_KEY) serves every person: each
 * person's connections are kept apart at Composio by their Naazhi user id, so no person ever has, sees or needs a key of their own.
 * The key never leaves the server and is never logged.
 */
const cfg = () => serverEnv().composio;

/** Is Composio set up on this server at all? */
export const composioConfigured = () => Boolean(cfg().apiKey);

/** Can this app be connected? It needs the API key and the app's own auth config (created once in the Composio dashboard). */
export const appAvailable = (app: ComposioAppId) => Boolean(cfg().apiKey && cfg().authConfigs[app]);

export function authConfigId(app: ComposioAppId): string {
  const id = cfg().authConfigs[app];
  if (!cfg().apiKey || !id) throw new ConflictError(`${COMPOSIO_APPS[app].name} isn’t set up on this server yet.`);
  return id;
}

/** The pinned version of an app's tools, when an admin set one. Without it the newest version is used (see tools.ts). */
export const toolkitVersion = (app: ComposioAppId) => cfg().toolkitVersions[app];

export const webhookSecret = () => cfg().webhookSecret;

const g = globalThis as unknown as { __composio?: { apiKey: string; client: Composio } };

/** One SDK client per server process (kept across dev hot-reloads), rebuilt if the key changes. */
export function composio(): Composio {
  const apiKey = cfg().apiKey;
  if (!apiKey) throw new ConflictError("Connecting apps isn’t set up on this server yet.");
  if (g.__composio?.apiKey !== apiKey) g.__composio = { apiKey, client: new Composio({ apiKey, allowTracking: false }) };
  return g.__composio.client;
}
