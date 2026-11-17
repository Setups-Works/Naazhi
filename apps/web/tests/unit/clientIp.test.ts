import { beforeEach, describe, expect, it, vi } from "vitest";

const env: { clientIpHeader?: string } = {};
vi.mock("../../src/config/env", () => ({ serverEnv: () => env }));

import { AUTH_IP_HEADER, clientIp, withAuthIp } from "../../src/server/clientIp";

const req = (headers: Record<string, string>, init: RequestInit = {}) => new Request("http://localhost/api/auth/x", { headers, ...init });

describe("clientIp (rate-limit address)", () => {
  beforeEach(() => {
    env.clientIpHeader = undefined;
  });

  it("takes the right-most x-forwarded-for entry, so a forged left-most one is ignored", () =>
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6, 1.2.3.4" }))).toBe("1.2.3.4"));
  it.each([
    ["1.2.3.4:52623", "1.2.3.4"],
    ["[2001:db8::1]:443", "2001:db8::1"],
    ["2001:db8::1", "2001:db8::1"],
  ])("strips the port from %s", (raw, ip) => expect(clientIp(req({ "x-forwarded-for": raw }))).toBe(ip));
  it("says unknown without any header", () => expect(clientIp(req({}))).toBe("unknown"));

  it("reads the configured header instead (Azure's x-client-ip)", () => {
    env.clientIpHeader = "x-client-ip";
    expect(clientIp(req({ "x-client-ip": "9.9.9.9:1234", "x-forwarded-for": "1.1.1.1" }))).toBe("9.9.9.9");
  });

  it("withAuthIp overwrites a visitor-sent auth header and keeps the body", async () => {
    env.clientIpHeader = "x-client-ip";
    const out = await withAuthIp(req({ "x-client-ip": "9.9.9.9", [AUTH_IP_HEADER]: "6.6.6.6" }, { method: "POST", body: '{"a":1}' }));
    expect(out.headers.get(AUTH_IP_HEADER)).toBe("9.9.9.9");
    expect(await out.text()).toBe('{"a":1}');
  });

  it("withAuthIp drops a visitor-sent auth header when no address is known", async () => {
    const out = await withAuthIp(req({ [AUTH_IP_HEADER]: "6.6.6.6" }));
    expect(out.headers.get(AUTH_IP_HEADER)).toBeNull();
  });
});
