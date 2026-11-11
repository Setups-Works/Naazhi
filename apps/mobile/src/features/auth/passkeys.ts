import * as Passkeys from "react-native-passkeys";

import type { MobileAuthClient } from "@/lib/auth-client";

export type Passkey = { id: string; name?: string | null; createdAt?: string | null; deviceType?: string | null };
export type PasskeyResult = { ok: true } | { ok: false; cancelled?: boolean; message: string };

// The phone's passkey sheet talks WebAuthn; the Naazhi server (Better Auth's passkey plugin) speaks the same JSON the web uses, so the
// app only carries the options and the answer between them (the same four routes the web's passkey client calls).
type Options = Parameters<typeof Passkeys.get>[0];
type CreateOptions = Parameters<typeof Passkeys.create>[0];
type Reply<T> = { data?: T | null; error?: { message?: string } | null };

const supported = () => {
  try {
    return Passkeys.isSupported();
  } catch {
    return false;
  }
};
export const passkeysSupported = supported;

const fail = (message: string, cancelled = false): PasskeyResult => ({ ok: false, cancelled, message });
const isCancel = (e: unknown) => /cancel|abort|NotAllowed|dismiss/i.test(e instanceof Error ? `${e.name} ${e.message}` : String(e));

/** Sign in with a passkey already saved on this phone (or in the person's password manager). */
export async function signInWithPasskey(auth: MobileAuthClient): Promise<PasskeyResult> {
  if (!supported()) return fail("Passkeys aren’t available on this phone.");
  const opts = (await auth.$fetch("/passkey/generate-authenticate-options", { method: "GET", throw: false })) as Reply<Options>;
  if (!opts.data) return fail(opts.error?.message ?? "Couldn’t start passkey sign-in.");
  let answer;
  try {
    answer = await Passkeys.get(opts.data);
  } catch (e) {
    return fail(isCancel(e) ? "Passkey sign-in was cancelled." : "Couldn’t use a passkey here.", isCancel(e));
  }
  if (!answer) return fail("Passkey sign-in was cancelled.", true);
  const verified = (await auth.$fetch("/passkey/verify-authentication", { method: "POST", body: { response: answer }, throw: false })) as Reply<unknown>;
  if (verified.error || !verified.data) return fail(verified.error?.message ?? "That passkey wasn’t accepted.");
  // The session cookie came back with the answer; the session store is told so the route guards let the person in.
  auth.$store.notify("$sessionSignal");
  return { ok: true };
}

/** Save a new passkey for the signed-in person on this phone. */
export async function addPasskey(auth: MobileAuthClient, name: string): Promise<PasskeyResult> {
  if (!supported()) return fail("Passkeys aren’t available on this phone.");
  const opts = (await auth.$fetch("/passkey/generate-register-options", { method: "GET", query: { name }, throw: false })) as Reply<CreateOptions>;
  if (!opts.data) return fail(opts.error?.message ?? "Couldn’t start adding a passkey.");
  let created;
  try {
    created = await Passkeys.create(opts.data);
  } catch (e) {
    return fail(isCancel(e) ? "Adding the passkey was cancelled." : "Couldn’t create a passkey here.", isCancel(e));
  }
  if (!created) return fail("Adding the passkey was cancelled.", true);
  const verified = (await auth.$fetch("/passkey/verify-registration", { method: "POST", body: { response: created, name }, throw: false })) as Reply<unknown>;
  if (verified.error || !verified.data) return fail(verified.error?.message ?? "Couldn’t save that passkey.");
  return { ok: true };
}

export async function listPasskeys(auth: MobileAuthClient): Promise<Passkey[]> {
  const res = (await auth.$fetch("/passkey/list-user-passkeys", { method: "GET", throw: false })) as Reply<Passkey[]>;
  return res.data ?? [];
}

export async function deletePasskey(auth: MobileAuthClient, id: string): Promise<boolean> {
  const res = (await auth.$fetch("/passkey/delete-passkey", { method: "POST", body: { id }, throw: false })) as Reply<unknown>;
  return !res.error;
}
