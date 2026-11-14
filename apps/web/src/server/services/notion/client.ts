import "server-only";
import { Composio } from "@composio/core";
import { serverEnv } from "../../../config/env";
import { ConflictError } from "../../errors";

/**
 * The one place that holds the Composio SDK, used only for Notion. One project API key serves every person, and each person gets their
 * own Composio session (their Naazhi user id), which keeps their Notion connection apart from everyone else's. Composio-managed
 * sign-in is used, so no auth config has to be created. The key never leaves the server and is never logged.
 */
const cfg = () => serverEnv().composio;

export const notionConfigured = () => Boolean(cfg().apiKey);

const g = globalThis as unknown as { __composio?: { apiKey: string; client: Composio } };

/** One SDK client per server process (kept across dev hot-reloads), rebuilt if the key changes. */
export function composio(): Composio {
  const apiKey = cfg().apiKey;
  if (!apiKey) throw new ConflictError("Connecting Notion isn’t set up on this server yet.");
  if (g.__composio?.apiKey !== apiKey) g.__composio = { apiKey, client: new Composio({ apiKey, allowTracking: false }) };
  return g.__composio.client;
}

/** This person's Composio session, limited to Notion. */
export const notionSession = (userId: string) => composio().create(userId, { toolkits: ["notion"] });
