import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { ComposioAppId } from "@untitled/types";
import { serverEnv } from "../../../config/env";
import { COMPOSIO_APPS, GOOGLE_IDENTITY_SCOPES } from "../../../lib/composio/apps";
import { COMPOSIO_APP_IDS } from "@untitled/types";
import { ConflictError, RateLimitError, ValidationError } from "../../errors";
import { underLimit } from "../../rateLimit";
import * as repo from "../../repositories/integrations.repository";
import { openKey, sealKey } from "../billing/keyVault";

/**
 * Sign in with Google (OAuth 2.0 "authorization code" flow for a server-side web app) for Gmail, Google Calendar and Google Drive
 * at once, and the tokens that come out of it.
 * - One sign-in covers every Google app: the person approves them all on Google's own page (and may untick some), and we never see a password.
 * - `state` is random, kept only as a hash, tied to the person who started it, single use and valid for ten minutes.
 * - The refresh token and the one-hour access token are sealed with the user id before they are stored; the browser only learns
 *   which account and which apps are connected.
 * Never log tokens, codes, the client secret, or anything from a person's mail, calendar or files.
 */
const STATE_TTL_SECONDS = 600;
const CONNECTS_PER_TEN_MINUTES = 10;
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const timeout = () => AbortSignal.timeout(15_000);
const cfg = () => serverEnv().google;

export const redirectUri = () => `${serverEnv().authUrl.replace(/\/+$/, "")}/api/v1/integrations/composio/callback`;
export const googleConfigured = () => Boolean(cfg().clientId && cfg().clientSecret && serverEnv().authSecret);

type Sealed = { access: string; refresh: string };
type Meta = { expires_at: string };
type TokenReply = { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error?: string };

const hash = (s: string) => createHash("sha256").update(s).digest("hex");

async function tokenCall(body: Record<string, string>): Promise<TokenReply | null> {
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...body, client_id: cfg().clientId ?? "", client_secret: cfg().clientSecret ?? "" }),
      signal: timeout(),
      cache: "no-store",
    });
    const j = (await res.json().catch(() => null)) as TokenReply | null;
    return res.ok && j?.access_token && !j.error ? j : null;
  } catch {
    return null;
  }
}

const expiresAt = (expiresIn?: number) => new Date(Date.now() + Math.max(60, expiresIn ?? 3600) * 1000).toISOString();

/** The apps whose every scope Google granted (a person can untick some on the approval page). */
export function appsFor(granted: string): ComposioAppId[] {
  const have = new Set(granted.split(/\s+/).filter(Boolean));
  return COMPOSIO_APP_IDS.filter((id) => COMPOSIO_APPS[id].scopes.every((s) => have.has(s)));
}

/** Step 1: the address of Google's approval page. One sign-in asks for every Google app. */
export async function startGoogleConnect(userId: string): Promise<string> {
  if (!googleConfigured()) throw new ConflictError("Connecting Google isn’t set up on this server yet.");
  if (!(await underLimit(`google-connect:${userId}`, CONNECTS_PER_TEN_MINUTES, 600))) throw new RateLimitError();
  const state = randomBytes(32).toString("base64url");
  await repo.saveOAuthState(userId, "google", hash(state), [...COMPOSIO_APP_IDS], STATE_TTL_SECONDS);
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: cfg().clientId!,
    redirect_uri: redirectUri(),
    scope: [...GOOGLE_IDENTITY_SCOPES, ...COMPOSIO_APP_IDS.flatMap((id) => COMPOSIO_APPS[id].scopes)].join(" "),
    // "offline" returns the refresh token; "consent" shows the approval page every time so a reconnect gets a fresh one.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "false",
    state,
  }).toString();
  return url.toString();
}

async function accountLabel(access: string): Promise<string> {
  try {
    const res = await fetch(USERINFO_URL, { headers: { authorization: `Bearer ${access}` }, signal: timeout(), cache: "no-store" });
    const j = (await res.json().catch(() => null)) as { email?: string } | null;
    return (j?.email ?? "").slice(0, 200);
  } catch {
    return "";
  }
}

/** Step 2: Google sent the person back with a code. Exchange it, seal the tokens and save the connection. */
export async function finishGoogleConnect(userId: string, p: { code: string; state: string }): Promise<void> {
  if (!googleConfigured()) throw new ConflictError("Connecting Google isn’t set up on this server yet.");
  const pending = await repo.takeOAuthState(userId, "google", hash(p.state));
  if (!pending) throw new ValidationError("That sign-in link expired or was already used. Start again from Settings.");
  const t = await tokenCall({ grant_type: "authorization_code", code: p.code, redirect_uri: redirectUri() });
  if (!t?.access_token || !t.refresh_token) throw new ConflictError("Google didn’t finish signing you in. Try again.");
  const apps = appsFor(t.scope ?? "");
  if (!apps.length) throw new ConflictError("No Google app was approved. Press Connect again and leave the boxes ticked.");
  await repo.saveIntegration(userId, {
    provider: "google",
    secret_cipher: sealKey(JSON.stringify({ access: t.access_token, refresh: t.refresh_token } satisfies Sealed), userId),
    label: (await accountLabel(t.access_token)) || "Google account",
    services: apps,
    scopes: t.scope ?? "",
    meta: { expires_at: expiresAt(t.expires_in) } satisfies Meta,
  });
}

export async function disconnectGoogle(userId: string): Promise<void> {
  const row = await repo.getIntegration(userId, "google");
  if (!row) return;
  const sealed = openKey(row.secret_cipher, userId);
  if (sealed) {
    try {
      const { refresh } = JSON.parse(sealed) as Sealed;
      // Best effort: Google gives up the grant; the person can also remove it in their Google account.
      await fetch(REVOKE_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: refresh }), signal: timeout(), cache: "no-store" });
    } catch {
      /* already revoked, or Google is unreachable */
    }
  }
  await repo.deleteIntegration(userId, "google");
}

export const isConnected = async (userId: string) => repo.getIntegration(userId, "google");

const refreshing = new Map<string, Promise<string>>();

/** A usable access token, refreshed first when it is about to run out. One refresh per person is shared by calls made at the same time. */
export async function accessToken(userId: string): Promise<{ token: string; apps: string[] } | null> {
  const row = await repo.getIntegration(userId, "google");
  if (!row) return null;
  const sealed = openKey(row.secret_cipher, userId);
  if (!sealed) return null;
  const tokens = JSON.parse(sealed) as Sealed;
  const meta = row.meta as Partial<Meta>;
  if (meta.expires_at && new Date(meta.expires_at).getTime() - Date.now() > 60_000) return { token: tokens.access, apps: row.services };
  const running = refreshing.get(userId);
  if (running) return { token: await running, apps: row.services };
  const job = (async () => {
    const t = await tokenCall({ grant_type: "refresh_token", refresh_token: tokens.refresh });
    if (!t?.access_token) {
      // A refresh token Google no longer accepts (revoked, or the person removed the app) can't be fixed here.
      await repo.deleteIntegration(userId, "google");
      throw new ConflictError("Your Google connection expired. Connect it again in Settings → Google.");
    }
    await repo.updateIntegrationTokens(
      userId,
      "google",
      sealKey(JSON.stringify({ access: t.access_token, refresh: tokens.refresh } satisfies Sealed), userId),
      { expires_at: expiresAt(t.expires_in) } satisfies Meta,
    );
    return t.access_token;
  })().finally(() => refreshing.delete(userId));
  refreshing.set(userId, job);
  return { token: await job, apps: row.services };
}
