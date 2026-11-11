import "server-only";
import { ConflictError, ForbiddenError, RateLimitError } from "../../../errors";
import { ZOHO_SERVICES, type ZohoServiceId } from "../../../../lib/zoho";
import type { ZohoAccess } from "./oauth";

/**
 * One way to call a Zoho service: the Zoho-oauthtoken header, a time limit, and Zoho's failures turned into messages a person can
 * act on ("reconnect", "your account doesn't allow that"). Response text is never logged; it can hold customer data.
 */
export type Ctx = ZohoAccess & { userId: string; service: ZohoServiceId };
export type J = Record<string, unknown>;

export const obj = (v: unknown): J => (v && typeof v === "object" && !Array.isArray(v) ? (v as J) : {});
export const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const str = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
/** Joins the parts that are not empty with a middle dot: dot("Won", "", "₹10") → "Won · ₹10". */
export const dot = (...parts: (string | undefined | null)[]) => parts.filter(Boolean).join(" · ");
export const q = (s: string) => encodeURIComponent(s);

/** What Zoho says went wrong, in its own words, short enough to show. */
function reason(j: unknown): string {
  const o = obj(j);
  const first = obj(arr(o.data)[0]);
  const m = str(o.message) || str(first.message) || str(o.errorMessage) || str(o.error_description) || str(o.error) || str(o.code);
  return m.slice(0, 160);
}

export async function zoho(ctx: Ctx, url: string, init: { method?: "GET" | "POST"; headers?: Record<string, string>; body?: unknown } = {}): Promise<unknown> {
  const name = ZOHO_SERVICES[ctx.service].name;
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? "GET",
      headers: {
        authorization: `Zoho-oauthtoken ${ctx.token}`,
        accept: "application/json",
        ...(init.body === undefined ? {} : { "content-type": "application/json" }),
        ...init.headers,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch {
    throw new ConflictError("We couldn’t reach Zoho. Try again in a moment.");
  }
  if (res.status === 204) return null; // Zoho's answer for "no records found"
  const j: unknown = await res.json().catch(() => null);
  if (res.status === 401) throw new ConflictError(`Zoho didn’t accept the connection for ${name}. Reconnect Zoho in Settings and keep ${name} ticked.`);
  if (res.status === 403) throw new ForbiddenError(`Your Zoho account doesn’t allow that in ${name}.`);
  if (res.status === 429) throw new RateLimitError("Zoho is busy right now. Try again in a minute.");
  if (!res.ok && res.status !== 207) throw new ConflictError(reason(j) || `${name} couldn’t do that (error ${res.status}).`);
  return j;
}

/** A value Zoho looks up once per person (an organisation id, an account id) kept for an hour. */
const memo = new Map<string, { at: number; value: string }>();
export async function remembered(ctx: Ctx, key: string, load: () => Promise<string>): Promise<string> {
  const k = `${ctx.userId}:${key}`;
  const hit = memo.get(k);
  if (hit && Date.now() - hit.at < 3_600_000) return hit.value;
  const value = await load();
  if (!value) throw new ConflictError(`Zoho didn’t return your ${ZOHO_SERVICES[ctx.service].name} account details.`);
  memo.set(k, { at: Date.now(), value });
  return value;
}
