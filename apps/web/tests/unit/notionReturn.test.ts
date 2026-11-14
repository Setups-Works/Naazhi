import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/config/env", () => ({ serverEnv: () => ({ authSecret: "test-secret", authUrl: "http://localhost:3000", composio: { apiKey: "k" } }) }));
vi.mock("../../src/server/rateLimit", () => ({ underLimit: async () => true }));
vi.mock("../../src/server/services/billing/keyVault", () => ({ sealKey: (s: string) => s }));
vi.mock("../../src/server/services/notion/client", () => ({ notionConfigured: () => true, notionSession: async () => ({}), composio: () => ({}) }));
vi.mock("../../src/server/repositories/integrations.repository", () => ({}));

const { signNotionReturn, verifyNotionReturn } = await import("../../src/server/services/notion/connection");

describe("Notion sign-in return token", () => {
  it("names the person who started the sign-in, refuses a changed or expired token", () => {
    const user = "0b1f6c1e-2c53-4c8a-9a45-9e9a6f1d2c11";
    const now = Date.now();
    const token = signNotionReturn(user, now);
    expect(verifyNotionReturn(token, now + 1000)).toBe(user);
    expect(verifyNotionReturn(token.replace(user, "1b1f6c1e-2c53-4c8a-9a45-9e9a6f1d2c11"), now)).toBeNull();
    expect(verifyNotionReturn(`${token}x`, now)).toBeNull();
    expect(verifyNotionReturn(token, now + 20 * 60 * 1000)).toBeNull();
    expect(verifyNotionReturn(null)).toBeNull();
  });
});
