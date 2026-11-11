import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { serverEnv } from "../../../../config/env";
import {
  isZohoAccountsServer,
  isZohoService,
  scopesFor,
  zoneOf,
  type ZohoServiceId,
  type ZohoStatus,
  ZOHO_SERVICES,
} from "../../../../lib/zoho";
import { ConflictError, ForbiddenError, ValidationError } from "../../../errors";
import * as repo from "../../../repositories/integrations.repository";
import { openKey, sealKey } from "../../billing/keyVault";

/**
 * Sign in with Zoho (OAuth 2.0 "authorization code" flow for server-based apps) and the tokens that come out of it.
 * - The person is sent to Zoho's own page and approves the services they picked; we never see their password.
 * - `state` is random, stored only as a hash, tied to the person who started it, single use, valid for ten minutes.
 * - The refresh token (and the one-hour access token) are sealed with the user id before they are stored; the browser only
 *   ever learns which account and which services are connected.
 * - Zoho stores each customer's data in one data center; the callback tells us which, and every later call goes to that one.
 * Never log tokens, codes, the client secret, or anything a person wrote.
 */

const STATE_TTL_SECONDS = 600;
const timeout = () => AbortSignal.timeout(15_000);
const cfg = () => serverEnv().zoho;

export const redirectUri = () => `${serverEnv().authUrl.replace(/\/+$/, "")}/api/v1/integrations/zoho/callback`;
export const zohoConfigured = () => Boolean(cfg().clientId && cfg().clientSecret && serverEnv().authSecret);

type Sealed = { access: string; refresh: string };
type Meta = { accounts: string; zone: string; expires_at: string };
type TokenReply = { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };

const hash = (s: string) => createHash("sha256").update(s).digest("hex");

/** Zoho answers token requests with HTTP 200 and an `error` field when something is wrong, so both are checked. */
async function tokenCall(accounts: string, body: Record<string, string>): Promise<TokenReply | null> {
  try {
    const res = await fetch(`${accounts}/oauth/v2/token`, {
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

/** Zoho reports `expires_in` in seconds for most services and milliseconds for a few; anything above a day is milliseconds. */
const expiresAt = (expiresIn?: number) => {
  const n = expiresIn && expiresIn > 0 ? expiresIn : 3600;
  return new Date(Date.now() + (n > 86_400 ? n : n * 1000)).toISOString();
};

export async function zohoStatus(userId: string): Promise<ZohoStatus> {
  const row = await repo.getIntegration(userId, "zoho");
  return {
    configured: zohoConfigured(),
    connected: Boolean(row),
    label: row?.label || null,
    services: (row?.services ?? []).filter(isZohoService),
    redirectUri: redirectUri(),
  };
}

/** Step 1: the address on Zoho's own page where the person approves access. */
export async function startZohoConnect(userId: string, picked: string[]): Promise<string> {
  if (!zohoConfigured()) throw new ConflictError("Zoho isn’t set up on this server yet.");
  const services = [...new Set(picked)].filter(isZohoService);
  if (!services.length) throw new ValidationError("Pick at least one Zoho service.");
  const state = randomBytes(32).toString("base64url");
  await repo.saveOAuthState(userId, "zoho", hash(state), services, STATE_TTL_SECONDS);
  const url = new URL(`${cfg().accountsServer}/oauth/v2/auth`);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: cfg().clientId!,
    scope: scopesFor(services).join(","),
    redirect_uri: redirectUri(),
    // "offline" returns the refresh token; "consent" makes Zoho show the approval page every time, so a re-connect gets a fresh one.
    access_type: "offline",
    prompt: "consent",
    state,
  }).toString();
  return url.toString();
}

/** Who the account is, shown in Settings. Best effort: a failure only means the label stays generic. */
async function profileLabel(accounts: string, access: string): Promise<string> {
  try {
    const res = await fetch(`${accounts}/oauth/user/info`, { headers: { authorization: `Zoho-oauthtoken ${access}` }, signal: timeout(), cache: "no-store" });
    const j = (await res.json().catch(() => null)) as { Email?: string; Display_Name?: string } | null;
    return (j?.Email || j?.Display_Name || "").slice(0, 200);
  } catch {
    return "";
  }
}

/** Step 2: Zoho sent the person back with a code. Exchange it, seal the tokens and save the connection. */
export async function finishZohoConnect(userId: string, p: { code: string; state: string; accountsServer: string | null }): Promise<void> {
  if (!zohoConfigured()) throw new ConflictError("Zoho isn’t set up on this server yet.");
  const pending = await repo.takeOAuthState(userId, "zoho", hash(p.state));
  if (!pending) throw new ValidationError("That sign-in link expired or was already used. Start again from Settings.");
  const accounts = (isZohoAccountsServer(p.accountsServer) ? p.accountsServer : cfg().accountsServer).replace(/\/+$/, "");
  if (!isZohoAccountsServer(accounts)) throw new ValidationError("Zoho sent us to a data center we don’t recognise.");
  const t = await tokenCall(accounts, { grant_type: "authorization_code", code: p.code, redirect_uri: redirectUri() });
  if (!t?.access_token || !t.refresh_token)
    throw new ConflictError("Zoho didn’t finish signing you in. Check the client id, secret and redirect address in the Zoho API console, then try again.");
  const services = pending.services.filter(isZohoService);
  const meta: Meta = { accounts, zone: zoneOf(accounts), expires_at: expiresAt(t.expires_in) };
  await repo.saveIntegration(userId, {
    provider: "zoho",
    secret_cipher: sealKey(JSON.stringify({ access: t.access_token, refresh: t.refresh_token } satisfies Sealed), userId),
    label: (await profileLabel(accounts, t.access_token)) || "Zoho account",
    services,
    scopes: scopesFor(services).join(","),
    meta,
  });
}

export async function disconnectZoho(userId: string): Promise<void> {
  const row = await repo.getIntegration(userId, "zoho");
  if (!row) return;
  // Ask Zoho to cancel the grant too (best effort: the local connection is removed either way).
  const sealed = openKey(row.secret_cipher, userId);
  const accounts = (row.meta as Partial<Meta>).accounts;
  if (sealed && isZohoAccountsServer(accounts)) {
    try {
      const { refresh } = JSON.parse(sealed) as Sealed;
      await fetch(`${accounts}/oauth/v2/token/revoke?${new URLSearchParams({ token: refresh })}`, { method: "POST", signal: timeout(), cache: "no-store" });
    } catch {
      /* the grant can also be removed in the person's Zoho account settings */
    }
  }
  await repo.deleteIntegration(userId, "zoho");
}

export type ZohoAccess = { token: string; zone: string; accounts: string; services: ZohoServiceId[] };

const refreshing = new Map<string, Promise<ZohoAccess>>();

/**
 * A usable access token for one request, refreshed first when it is about to run out. Several cards in one reply ask at the same
 * time, so one refresh per person is shared (Zoho allows only a few new tokens per refresh token every ten minutes).
 * `need` is the service the caller is about to use; a service the person did not pick at connect time is refused with a clear message.
 */
export async function zohoAccess(userId: string, need?: ZohoServiceId): Promise<ZohoAccess> {
  const row = await repo.getIntegration(userId, "zoho");
  if (!row) throw new ConflictError("Connect your Zoho account in Settings first.");
  const services = row.services.filter(isZohoService);
  if (need && !services.includes(need))
    throw new ConflictError(`${ZOHO_SERVICES[need].name} isn’t connected. Open Settings → Zoho and add it.`);
  const meta = row.meta as Partial<Meta>;
  const sealed = openKey(row.secret_cipher, userId);
  if (!sealed || !isZohoAccountsServer(meta.accounts) || !meta.zone)
    throw new ConflictError("Your Zoho connection needs to be set up again. Reconnect it in Settings.");
  const tokens = JSON.parse(sealed) as Sealed;
  const accounts = meta.accounts;
  const zone = meta.zone;
  if (meta.expires_at && new Date(meta.expires_at).getTime() - Date.now() > 60_000) return { token: tokens.access, zone, accounts, services };

  const running = refreshing.get(userId);
  if (running) return running;
  const job = (async () => {
    const t = await tokenCall(accounts, { grant_type: "refresh_token", refresh_token: tokens.refresh });
    if (!t?.access_token) {
      // A refresh token Zoho no longer accepts (revoked, or the person removed the app) can't be fixed here.
      await repo.deleteIntegration(userId, "zoho");
      throw new ForbiddenError("Your Zoho connection expired. Connect it again in Settings.");
    }
    await repo.updateIntegrationTokens(
      userId,
      "zoho",
      sealKey(JSON.stringify({ access: t.access_token, refresh: t.refresh_token ?? tokens.refresh } satisfies Sealed), userId),
      { accounts, zone, expires_at: expiresAt(t.expires_in) } satisfies Meta,
    );
    return { token: t.access_token, zone, accounts, services };
  })().finally(() => refreshing.delete(userId));
  refreshing.set(userId, job);
  return job;
}
