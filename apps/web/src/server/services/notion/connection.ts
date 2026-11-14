import "server-only";
import type { NotionStatus } from "@untitled/types";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "../../../config/env";
import { ConflictError, RateLimitError } from "../../errors";
import { underLimit } from "../../rateLimit";
import * as repo from "../../repositories/integrations.repository";
import { sealKey } from "../billing/keyVault";
import { composio, notionConfigured, notionSession } from "./client";

/**
 * Connecting Notion through a Composio session. The person signs in on Notion's own page and chooses which pages to share; Composio keeps
 * the tokens and knows whether the connection works, so nothing about the connection is stored here. The one row we keep in
 * `user_integrations` (provider `notion`) holds `meta.imported`, the pages already turned into notes.
 */
const CONNECTS_PER_TEN_MINUTES = 10;

const TOKEN_TTL_SECONDS = 900;
const sign = (payload: string) => createHmac("sha256", serverEnv().authSecret ?? "").update(`notion-return:${payload}`).digest("base64url");

/**
 * A short-lived, signed note of whose sign-in this is, carried in the callback address. The phone's in-app sheet comes back from Notion
 * without the person's session, so the callback reads who it was from this instead. It proves nothing but "this user started a Notion
 * sign-in in the last 15 minutes", and finishing a sign-in only asks Composio whether that user's own connection is active.
 */
/** Without the server's auth secret nothing can be signed, so nothing is accepted. */
const hasSecret = () => Boolean(serverEnv().authSecret);

export function signNotionReturn(userId: string, now = Date.now()): string {
  const payload = `${userId}.${Math.floor(now / 1000) + TOKEN_TTL_SECONDS}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyNotionReturn(token: string | null, now = Date.now()): string | null {
  if (!hasSecret()) return null;
  const m = /^([0-9a-f-]{36})\.(\d{1,12})\.([\w-]{20,80})$/i.exec(token ?? "");
  if (!m) return null;
  const expected = Buffer.from(sign(`${m[1]}.${m[2]}`));
  const given = Buffer.from(m[3]);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return Number(m[2]) * 1000 > now ? m[1] : null;
}

export const notionCallbackUrl = (userId: string) => `${serverEnv().authUrl.replace(/\/+$/, "")}/api/v1/integrations/notion/callback?u=${signNotionReturn(userId)}`;

/** The person's connected Notion account at Composio, or null when there is none. */
async function connectedAccount(userId: string): Promise<{ id: string } | null> {
  const { items } = await (await notionSession(userId)).toolkits({ toolkits: ["notion"] });
  const c = items.find((t) => t.slug.toLowerCase() === "notion")?.connection;
  return c?.isActive && c.connectedAccount ? { id: c.connectedAccount.id } : null;
}

export async function notionStatus(userId: string): Promise<NotionStatus> {
  if (!notionConfigured()) return { configured: false, connected: false, account: null };
  try {
    const on = Boolean(await connectedAccount(userId));
    return { configured: true, connected: on, account: on ? "Notion workspace" : null };
  } catch {
    // Composio unreachable: show "not connected" rather than an error on the whole Settings page.
    return { configured: true, connected: false, account: null };
  }
}

/** Throws a message that says what to do unless the person's Notion works. */
export async function requireNotion(userId: string): Promise<void> {
  if (!(await connectedAccount(userId))) throw new ConflictError("Connect Notion in Settings → Imports & backup first.");
}

/** Step 1: the address of Notion's own sign-in page. */
export async function startNotionConnect(userId: string): Promise<string> {
  if (!notionConfigured()) throw new ConflictError("Connecting Notion isn’t set up on this server yet.");
  if (!(await underLimit(`notion-connect:${userId}`, CONNECTS_PER_TEN_MINUTES, 600))) throw new RateLimitError();
  if (await connectedAccount(userId).catch(() => null)) throw new ConflictError("Notion is already connected. Disconnect it first to connect another workspace.");
  try {
    const request = await (await notionSession(userId)).authorize("notion", { callbackUrl: notionCallbackUrl(userId) });
    if (!request.redirectUrl) throw new Error("no redirect");
    return request.redirectUrl;
  } catch (e) {
    console.error("notion connect failed", e instanceof Error ? e.name : "unknown error");
    throw new ConflictError("We couldn’t reach Notion. Try again in a moment.");
  }
}

/** Step 2: the person came back. Ask Composio whether the connection is active, and make the row that remembers imported pages. */
export async function finishNotionConnect(userId: string): Promise<void> {
  if (!(await connectedAccount(userId).catch(() => null))) throw new ConflictError("Notion didn’t finish connecting. Start again from Settings.");
  if (!(await repo.getIntegration(userId, "notion")))
    await repo.saveIntegration(userId, { provider: "notion", secret_cipher: sealKey("composio-session", userId), label: "Notion workspace", services: ["connected"], scopes: "", meta: {} });
}

export async function disconnectNotion(userId: string): Promise<void> {
  if (notionConfigured()) {
    try {
      const account = await connectedAccount(userId);
      if (account) await composio().connectedAccounts.delete(account.id);
    } catch {
      /* already gone, or Composio is unreachable: our record is removed either way */
    }
  }
  await repo.deleteIntegration(userId, "notion");
}
