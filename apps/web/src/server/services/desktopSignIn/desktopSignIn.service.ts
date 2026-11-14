import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import * as repo from "../../repositories/desktopSignIn.repository";

/**
 * Signing in to the desktop app with a code (Google refuses sign-in inside the app's window, so the person approves in their browser):
 *
 *  1. The app asks for a request (`startRequest`) and shows the six-character code; it keeps the secret.
 *  2. In the browser the person signs in, sees the same code and presses Authorize (`approveRequest`, with a one-time token made for
 *     their session).
 *  3. The app asks again with its secret (`collectRequest`) and receives the token once, then trades it for its own session.
 */

const MINUTES = 10;
// No 0/O or 1/I, so a code is easy to read off a screen and compare.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const codeInput = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-HJ-NP-Z2-9]{6}$/) });
export const collectInput = codeInput.extend({ secret: z.string().min(20).max(80) });

const hash = (secret: string) => createHash("sha256").update(secret).digest("hex");
const makeCode = () => Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

export async function startRequest(): Promise<{ code: string; secret: string; expiresInSeconds: number }> {
  await repo.deleteExpired();
  const secret = randomBytes(24).toString("base64url");
  for (let i = 0; i < 5; i++) {
    const code = makeCode();
    if (await repo.insertRequest(code, hash(secret), MINUTES)) return { code, secret, expiresInSeconds: MINUTES * 60 };
  }
  throw new Error("Could not make a sign-in code");
}

/** True when the code is waiting for approval; the page checks this before it asks the person to press Authorize. */
export const isOpen = (code: string) => repo.codeIsOpen(code);

export const approveRequest = (code: string, userId: string, token: string) => repo.approve(code, userId, token);

export type Collected = { status: "pending" } | { status: "expired" } | { status: "approved"; token: string };

export async function collectRequest(code: string, secret: string): Promise<Collected> {
  const row = await repo.findRequest(code);
  if (!row) return { status: "expired" };
  const given = Buffer.from(hash(secret));
  const stored = Buffer.from(row.secret_hash);
  // Same answer as "gone" for a wrong secret, so a code can't be probed.
  if (given.length !== stored.length || !timingSafeEqual(given, stored)) return { status: "expired" };
  if (row.expired) {
    await repo.removeRequest(code);
    return { status: "expired" };
  }
  if (!row.token) return { status: "pending" };
  await repo.removeRequest(code);
  return { status: "approved", token: row.token };
}
