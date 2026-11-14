import "server-only";
import { Composio } from "@composio/core";
import { serverEnv } from "../../../config/env";
import { ConflictError } from "../../errors";

/**
 * The one place that holds the Composio SDK, used only for Notion. One project API key serves every person; each person's Notion
 * connection is kept apart at Composio by their Naazhi user id. The key never leaves the server and is never logged.
 */
const cfg = () => serverEnv().composio;

export const notionConfigured = () => Boolean(cfg().apiKey && cfg().authConfigs.notion);

export function notionAuthConfig(): string {
  const id = cfg().authConfigs.notion;
  if (!cfg().apiKey || !id) throw new ConflictError("Connecting Notion isn’t set up on this server yet.");
  return id;
}

const g = globalThis as unknown as { __composio?: { apiKey: string; client: Composio } };

/** One SDK client per server process (kept across dev hot-reloads), rebuilt if the key changes. */
export function composio(): Composio {
  const apiKey = cfg().apiKey;
  if (!apiKey) throw new ConflictError("Connecting Notion isn’t set up on this server yet.");
  if (g.__composio?.apiKey !== apiKey) g.__composio = { apiKey, client: new Composio({ apiKey, allowTracking: false }) };
  return g.__composio.client;
}
