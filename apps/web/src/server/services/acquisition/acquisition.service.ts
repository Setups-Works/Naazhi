import "server-only";
import { DIRECT, parseAttribution, sanitizeAttribution, type Attribution } from "@untitled/logic/acquisition";
import { userDb } from "../../db/builders";
import { hasAcquisition, insertAcquisition } from "../../repositories/acquisition.repository";
import type { AcquisitionInput } from "./acquisition.schema";

/** The cookie holds the already-parsed source as short JSON; it is treated as untrusted input like anything else the browser sends. */
function fromCookie(raw: string | undefined): Attribution | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    const a = sanitizeAttribution({
      source: typeof o.s === "string" ? o.s : "",
      medium: typeof o.m === "string" ? o.m : "",
      campaign: typeof o.c === "string" ? o.c : "",
      referrerHost: typeof o.r === "string" ? o.r : "",
    });
    return a.source === DIRECT.source ? null : a;
  } catch {
    return null;
  }
}

/**
 * Remembers where this person came from, once. The phone gives its Google Play install referrer; the website's first-party cookie is
 * read on the server. Calling it again does nothing, so the clients can simply call it on first use.
 */
export async function recordAcquisition(userId: string, input: AcquisitionInput, cookie: string | undefined) {
  const db = userDb(userId);
  if (await hasAcquisition(db)) return { recorded: false };
  const platform = input.platform ?? "web";
  const a = (input.referrer ? parseAttribution({ query: input.referrer }) : null) ?? fromCookie(cookie) ?? DIRECT;
  await insertAcquisition(db, { user_id: userId, source: a.source, medium: a.medium, campaign: a.campaign, referrer_host: a.referrerHost, platform });
  return { recorded: true };
}
