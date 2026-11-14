import "server-only";
import type { NotionStatus } from "@untitled/types";
import { serverEnv } from "../../../config/env";
import { ConflictError, RateLimitError, ValidationError } from "../../errors";
import { underLimit } from "../../rateLimit";
import * as repo from "../../repositories/integrations.repository";
import { openKey, sealKey } from "../billing/keyVault";
import { composio, notionAuthConfig, notionConfigured } from "./client";

/**
 * Connecting Notion through Composio. The person signs in on Notion's own page and chooses which pages to share; Composio keeps the
 * tokens, and we keep only the id of the connection, sealed with the user id like every other stored credential.
 * `services` is ["pending"] until the sign-in is confirmed with Composio, then ["connected"].
 */
const WAIT_FOR_SIGN_IN_MS = 15_000;
const CONNECTS_PER_TEN_MINUTES = 10;

export const notionCallbackUrl = () => `${serverEnv().authUrl.replace(/\/+$/, "")}/api/v1/integrations/notion/callback`;

export async function notionStatus(userId: string): Promise<NotionStatus> {
  const row = await repo.getIntegration(userId, "notion");
  return { configured: notionConfigured(), connected: row?.services.includes("connected") ?? false, account: row?.services.includes("connected") ? row.label || null : null };
}

/** The person's working Notion connection id, or an error that says what to do. */
export async function notionConnectionId(userId: string): Promise<string> {
  const row = await repo.getIntegration(userId, "notion");
  const id = row && row.services.includes("connected") ? openKey(row.secret_cipher, userId) : null;
  if (!id) throw new ConflictError("Connect Notion in Settings → Imports & backup first.");
  return id;
}

/** Step 1: the address of Notion's own sign-in page. */
export async function startNotionConnect(userId: string): Promise<string> {
  const authConfig = notionAuthConfig();
  if (!(await underLimit(`notion-connect:${userId}`, CONNECTS_PER_TEN_MINUTES, 600))) throw new RateLimitError();
  const existing = await repo.getIntegration(userId, "notion");
  if (existing?.services.includes("connected")) throw new ConflictError("Notion is already connected. Disconnect it first to connect another workspace.");
  let request: Awaited<ReturnType<ReturnType<typeof composio>["connectedAccounts"]["link"]>>;
  try {
    request = await composio().connectedAccounts.link(userId, authConfig, { callbackUrl: notionCallbackUrl() });
  } catch (e) {
    console.error("notion connect failed", e instanceof Error ? e.name : "unknown error");
    throw new ConflictError("We couldn’t reach Notion. Try again in a moment.");
  }
  if (!request.redirectUrl) throw new ConflictError("Notion didn’t give us a sign-in page. Try again in a moment.");
  await repo.saveIntegration(userId, { provider: "notion", secret_cipher: sealKey(request.id, userId), label: "", services: ["pending"], scopes: "", meta: {} });
  return request.redirectUrl;
}

/** Step 2: the person came back. Confirm with Composio that the connection is active, then mark it connected. */
export async function finishNotionConnect(userId: string): Promise<void> {
  const row = await repo.getIntegration(userId, "notion");
  const id = row ? openKey(row.secret_cipher, userId) : null;
  if (!row || !id) throw new ValidationError("That sign-in link expired or was already used. Start again from Settings.");
  if (row.services.includes("connected")) return; // the page was opened twice
  try {
    const account = await composio().connectedAccounts.waitForConnection(id, WAIT_FOR_SIGN_IN_MS);
    if (account.toolkit.slug.toLowerCase() !== "notion" || account.status !== "ACTIVE") throw new Error("not active");
  } catch {
    await repo.deleteIntegration(userId, "notion");
    throw new ConflictError("Notion didn’t finish connecting. Start again from Settings.");
  }
  await repo.saveIntegration(userId, { ...row, services: ["connected"], label: "Notion workspace" });
}

export async function disconnectNotion(userId: string): Promise<void> {
  const row = await repo.getIntegration(userId, "notion");
  if (!row) return;
  const id = openKey(row.secret_cipher, userId);
  if (id && notionConfigured()) {
    try {
      await composio().connectedAccounts.delete(id);
    } catch {
      /* already gone, or Composio is unreachable: our record is removed either way */
    }
  }
  await repo.deleteIntegration(userId, "notion");
}
