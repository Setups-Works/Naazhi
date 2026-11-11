import "server-only";
import type { AiCatalog, AiCatalogGroup, DeviceLoginPoll, DeviceLoginStart } from "@untitled/types";
import { CONNECT_PROVIDERS, connectProvider, modelLabel, type ConnectProvider } from "@untitled/logic/aiConnections";
import { serverEnv } from "../../../config/env";
import { ConflictError, ForbiddenError, ValidationError } from "../../errors";
import * as repo from "../../repositories/aiConnections.repository";
import { openKey, sealKey } from "../billing/keyVault";

/**
 * What a person has connected in the model picker, and how a chat reply gets its credentials from it.
 * - An API key for OpenAI, Anthropic, Google or OpenRouter: checked against the provider before it is saved, sealed, and only
 *   opened for the one request that uses it. The addresses are the fixed ones in @untitled/logic/aiConnections.
 * - "Sign in with ChatGPT": the device-code OAuth flow (the person approves a short code on ChatGPT's own page; we never see their
 *   password). Tokens are sealed the same way and refreshed when they run out. It needs an OAuth client id for this app; without
 *   it the option says it isn't set up.
 * Never log keys, tokens, codes or any text a person wrote.
 */

const timeout = () => AbortSignal.timeout(15_000);

/* ------------------------------ API keys ------------------------------ */

/** Asks the provider for its model list with the key: a wrong key fails here, not in the middle of a chat. Returns the usable model ids. */
async function fetchModels(p: ConnectProvider, key: string): Promise<string[] | "rejected" | "unreachable"> {
  let res: Response;
  try {
    res = await fetch(`${p.baseUrl}/models`, { headers: { authorization: `Bearer ${key}`, ...(p.id === "anthropic" ? { "x-api-key": key, "anthropic-version": "2023-06-01" } : {}) }, signal: timeout(), cache: "no-store" });
  } catch {
    return "unreachable";
  }
  if (res.status === 401 || res.status === 403) return "rejected";
  if (!res.ok) return "unreachable";
  const j = (await res.json().catch(() => null)) as { data?: { id?: string }[] } | null;
  return (j?.data ?? []).map((m) => String(m.id ?? "").replace(/^models\//, "")).filter((id) => id && p.keep.test(id));
}

export async function saveKey(userId: string, provider: string, apiKey: string) {
  const p = connectProvider(provider);
  if (!p) throw new ValidationError("Choose one of the listed providers.");
  const models = await fetchModels(p, apiKey);
  if (models === "rejected") throw new ValidationError(`${p.label} didn’t accept that key. Check it and try again.`);
  if (models === "unreachable") throw new ConflictError(`We couldn’t reach ${p.label} to check the key. Try again in a moment.`);
  await repo.saveConnection(userId, { provider: p.id, kind: "key", secret_cipher: sealKey(apiKey, userId), key_hint: apiKey.slice(-4) });
}

export async function removeConnection(userId: string, provider: string) {
  if (provider !== "chatgpt" && !connectProvider(provider)) throw new ValidationError("Choose one of the listed providers.");
  await repo.deleteConnection(userId, provider);
}

/** The person's key for a provider, opened for one request, with the provider's fixed address. */
export async function keyCredentials(userId: string, provider: string) {
  const p = connectProvider(provider);
  const row = p ? await repo.getConnection(userId, p.id) : null;
  if (!p || !row || row.kind !== "key") throw new ForbiddenError("Add your API key in the model picker to use that model.");
  const apiKey = openKey(row.secret_cipher, userId);
  if (!apiKey) throw new ForbiddenError("Your saved API key couldn’t be used. Add it again in the model picker.");
  return { apiKey, baseUrl: p.baseUrl };
}

/* ------------------------------ ChatGPT sign-in ------------------------------ */

const oauth = () => serverEnv().chatgptOauth;
export const chatgptConfigured = () => Boolean(oauth().clientId);

type Tokens = { access_token?: string; refresh_token?: string; id_token?: string; expires_in?: number };
type Sealed = { access: string; refresh: string };

/** The ChatGPT account id lives in a claim of the token; it is only read as a label for requests, not trusted for access. */
function accountIdOf(...jwts: (string | undefined)[]): string | null {
  for (const t of jwts) {
    try {
      const payload = JSON.parse(Buffer.from(String(t).split(".")[1] ?? "", "base64url").toString("utf8")) as Record<string, unknown>;
      const auth = payload["https://api.openai.com/auth"] as { chatgpt_account_id?: string } | undefined;
      if (auth?.chatgpt_account_id) return auth.chatgpt_account_id;
    } catch {
      /* try the next token */
    }
  }
  return null;
}

async function tokenCall(body: URLSearchParams): Promise<Tokens | null> {
  try {
    const res = await fetch(`${oauth().issuer}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: timeout(),
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as Tokens) : null;
  } catch {
    return null;
  }
}

async function storeTokens(userId: string, t: Tokens, previous?: Sealed) {
  const access = t.access_token;
  const refresh = t.refresh_token ?? previous?.refresh;
  if (!access || !refresh) throw new ConflictError("ChatGPT didn’t finish signing you in. Try again.");
  await repo.saveConnection(userId, {
    provider: "chatgpt",
    kind: "oauth",
    secret_cipher: sealKey(JSON.stringify({ access, refresh } satisfies Sealed), userId),
    key_hint: "",
    meta: { account_id: accountIdOf(t.id_token, access), expires_at: new Date(Date.now() + (t.expires_in ?? 3600) * 1000).toISOString() },
  });
}

/** Step 2: asks ChatGPT for a short code the person approves on its own page. */
export async function startChatgptLogin(userId: string): Promise<DeviceLoginStart> {
  const { clientId, issuer } = oauth();
  if (!clientId) throw new ConflictError("Sign in with ChatGPT isn’t set up on this server yet.");
  let res: Response;
  try {
    res = await fetch(`${issuer}/api/accounts/deviceauth/usercode`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ client_id: clientId }),
      signal: timeout(),
      cache: "no-store",
    });
  } catch {
    throw new ConflictError("We couldn’t reach ChatGPT. Try again in a moment.");
  }
  if (res.status === 404 || res.status === 403)
    throw new ConflictError("ChatGPT turned that down. Make sure “Allow device code login” is on in your ChatGPT settings, then try again.");
  if (!res.ok) throw new ConflictError("ChatGPT couldn’t start the sign-in. Try again in a moment.");
  const j = (await res.json().catch(() => null)) as { device_auth_id?: string; user_code?: string; usercode?: string; interval?: string | number } | null;
  const code = j?.user_code ?? j?.usercode;
  if (!j?.device_auth_id || !code) throw new ConflictError("ChatGPT couldn’t start the sign-in. Try again in a moment.");
  const interval = Math.min(30, Math.max(3, Number(j.interval) || 5));
  const expiresIn = 15 * 60;
  await repo.saveDeviceLogin(userId, { device_auth_id: j.device_auth_id, user_code: code, interval_s: interval, expires_in_s: expiresIn });
  return { user_code: code, verification_url: `${issuer}/codex/device`, interval_seconds: interval, expires_at: new Date(Date.now() + expiresIn * 1000).toISOString() };
}

/** Step 3: has the person approved the code yet? Pending until they do; then the tokens are exchanged, sealed and stored. */
export async function pollChatgptLogin(userId: string): Promise<DeviceLoginPoll> {
  const { clientId, issuer } = oauth();
  if (!clientId) throw new ConflictError("Sign in with ChatGPT isn’t set up on this server yet.");
  const pending = await repo.getDeviceLogin(userId);
  if (!pending) return { status: "expired" };
  let res: Response;
  try {
    res = await fetch(`${issuer}/api/accounts/deviceauth/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ device_auth_id: pending.device_auth_id, user_code: pending.user_code }),
      signal: timeout(),
      cache: "no-store",
    });
  } catch {
    return { status: "pending" };
  }
  if (res.status === 403 || res.status === 404) return { status: "pending" };
  if (!res.ok) {
    await repo.deleteDeviceLogin(userId);
    return { status: "expired" };
  }
  const j = (await res.json().catch(() => null)) as { authorization_code?: string; code_verifier?: string } | null;
  if (!j?.authorization_code || !j.code_verifier) return { status: "pending" };
  const tokens = await tokenCall(
    new URLSearchParams({
      grant_type: "authorization_code",
      code: j.authorization_code,
      redirect_uri: `${issuer}/deviceauth/callback`,
      client_id: clientId,
      code_verifier: j.code_verifier,
    }),
  );
  await repo.deleteDeviceLogin(userId);
  if (!tokens) throw new ConflictError("ChatGPT didn’t finish signing you in. Try again.");
  await storeTokens(userId, tokens);
  return { status: "connected" };
}

/** The access token for one ChatGPT reply, refreshed first when it is about to run out. */
export async function chatgptCredentials(userId: string) {
  const { clientId, apiBase } = oauth();
  const row = await repo.getConnection(userId, "chatgpt");
  const sealed = row ? openKey(row.secret_cipher, userId) : null;
  if (!clientId || !row || !sealed) throw new ForbiddenError("Connect your ChatGPT account in the model picker to use it.");
  let tokens = JSON.parse(sealed) as Sealed;
  let meta = row.meta as { account_id?: string | null; expires_at?: string };
  if (!meta.expires_at || new Date(meta.expires_at).getTime() - Date.now() < 60_000) {
    const fresh = await tokenCall(new URLSearchParams({ grant_type: "refresh_token", refresh_token: tokens.refresh, client_id: clientId }));
    if (!fresh?.access_token) {
      await repo.deleteConnection(userId, "chatgpt");
      throw new ForbiddenError("Your ChatGPT connection expired. Connect it again in the model picker.");
    }
    await storeTokens(userId, fresh, tokens);
    tokens = { access: fresh.access_token, refresh: fresh.refresh_token ?? tokens.refresh };
    meta = { ...meta, account_id: accountIdOf(fresh.id_token, fresh.access_token) ?? meta.account_id };
  }
  return { apiKey: tokens.access, baseUrl: apiBase, headers: { ...(meta.account_id ? { "chatgpt-account-id": meta.account_id } : {}), originator: "naazhi", "openai-beta": "responses=experimental" } };
}

/* ------------------------------ the picker's catalog ------------------------------ */

const cache = new Map<string, { at: number; ids: string[] }>();

/** Everything the picker shows: ChatGPT first, then each provider with its models (the provider's live list once a key is saved). */
export async function catalogFor(userId: string): Promise<AiCatalog> {
  const rows = await repo.listConnections(userId);
  const by = new Map(rows.map((r) => [r.provider, r]));
  const groups: AiCatalogGroup[] = [
    {
      id: "chatgpt",
      label: "ChatGPT",
      kind: "chatgpt",
      configured: chatgptConfigured(),
      connected: by.has("chatgpt"),
      hint: null,
      keyUrl: null,
      models: oauth().models.map((id) => ({ id, label: id.toUpperCase().replace(/^GPT-/, "GPT-"), note: "Paid through your ChatGPT plan" })),
    },
  ];
  for (const p of CONNECT_PROVIDERS) {
    const row = by.get(p.id);
    let models = p.models;
    if (row?.kind === "key") {
      const hit = cache.get(`${userId}:${p.id}`);
      let ids = hit && Date.now() - hit.at < 5 * 60_000 ? hit.ids : null;
      if (!ids) {
        const key = openKey(row.secret_cipher, userId);
        const live = key ? await fetchModels(p, key) : null;
        ids = Array.isArray(live) && live.length ? live.slice(0, 25) : null;
        if (ids) cache.set(`${userId}:${p.id}`, { at: Date.now(), ids });
      }
      if (ids) models = ids.map((id) => p.models.find((m) => m.id === id) ?? { id, label: modelLabel(p, id), note: "" });
    }
    groups.push({ id: p.id, label: p.label, kind: "key", configured: true, connected: row?.kind === "key", hint: row?.key_hint || null, keyUrl: p.keyUrl, models });
  }
  return { groups };
}
