import "server-only";
import { serverEnv } from "../config/env";

/** "1.2.3.4:5678" → "1.2.3.4"; "[::1]:443" → "::1"; a bare IPv6 address stays as it is. */
function stripPort(value: string): string {
  const v = value.trim();
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(v);
  if (bracketed) return bracketed[1];
  return /^[\d.]+:\d+$/.test(v) ? v.slice(0, v.lastIndexOf(":")) : v;
}

/**
 * The visitor's address, for rate limits only (never stored). Reads the trusted header when one is configured; otherwise the
 * right-most `x-forwarded-for` entry, which our own proxy appended. The left-most entry is whatever the client sent, so keying a
 * limit on it lets anyone pick a fresh bucket per request.
 */
/**
 * The header Better Auth reads its address from. The auth route always overwrites it with `clientIp()` (never the visitor's own
 * value), so Better Auth gets one clean address without a port, whatever format the hosting front end uses.
 */
export const AUTH_IP_HEADER = "x-naazhi-client-ip";

/** A copy of the request whose `AUTH_IP_HEADER` is our own reading of the client address, for Better Auth's rate limits. */
export async function withAuthIp(req: Request): Promise<Request> {
  const headers = new Headers(req.headers);
  headers.delete(AUTH_IP_HEADER);
  const ip = clientIp(req);
  if (ip !== "unknown") headers.set(AUTH_IP_HEADER, ip);
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();
  return new Request(req.url, { method: req.method, headers, body });
}

export function clientIp(req: Request): string {
  const header = serverEnv().clientIpHeader;
  const raw = header ? req.headers.get(header) : req.headers.get("x-forwarded-for");
  const hop = (raw ?? "").split(",").map((s) => s.trim()).filter(Boolean).pop();
  return hop ? stripPort(hop) : "unknown";
}
