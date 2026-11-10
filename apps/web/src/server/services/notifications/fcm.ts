import "server-only";
import { createSign } from "node:crypto";
import { serverEnv } from "../../../config";

/** Sends push messages through Firebase Cloud Messaging (HTTP v1) with the service account in FCM_SERVICE_ACCOUNT. No extra package. */

type Account = { project_id: string; client_email: string; private_key: string };
let cached: { token: string; until: number } | null = null;

function account(): Account | null {
  const raw = serverEnv().fcmServiceAccount;
  if (!raw) return null;
  try {
    const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const a = JSON.parse(text) as Partial<Account>;
    return a.project_id && a.client_email && a.private_key ? (a as Account) : null;
  } catch {
    return null;
  }
}

export const pushConfigured = () => account() !== null;

const b64 = (v: object | Buffer) => Buffer.from(v instanceof Buffer ? v : JSON.stringify(v)).toString("base64url");

async function accessToken(a: Account): Promise<string> {
  if (cached && cached.until > Date.now() + 60_000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const head = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: a.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = createSign("RSA-SHA256").update(head).sign(a.private_key).toString("base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${sig}` }),
  });
  if (!res.ok) throw new Error("push sign-in failed");
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: j.access_token, until: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

/** Sends to each token; returns the tokens Firebase says are no longer valid so the caller can forget them. */
export async function sendPush(tokens: string[], msg: { title: string; body: string; url?: string | null }): Promise<string[]> {
  const a = account();
  if (!a || tokens.length === 0) return [];
  const bearer = await accessToken(a);
  const dead: string[] = [];
  for (let i = 0; i < tokens.length; i += 10) {
    await Promise.all(
      tokens.slice(i, i + 10).map(async (token) => {
        const res = await fetch(`https://fcm.googleapis.com/v1/projects/${a.project_id}/messages:send`, {
          method: "POST",
          headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json" },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: msg.title, body: msg.body },
              data: msg.url ? { url: msg.url } : undefined,
              android: { priority: "HIGH", notification: { channel_id: "messages" } },
            },
          }),
        }).catch(() => null);
        if (res && (res.status === 404 || res.status === 400)) dead.push(token);
      }),
    );
  }
  return dead;
}
