import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { billingSettingsInput, byoKeyInput, creditAdjustInput, planIdInput, planPatchInput } from "../../src/server/services/billing/billing.schema";
import { openKey, sealKey } from "../../src/server/services/billing/keyVault";

describe("billing input", () => {
  it("accepts only the three plans", () => {
    expect(planIdInput.safeParse({ planId: "payg" }).success).toBe(true);
    expect(planIdInput.safeParse({ planId: "pro" }).success).toBe(false);
  });

  it("accepts a key only for a listed provider, and refuses spaces and short keys", () => {
    const ok = { provider: "openai", model: "gpt-4o-mini", apiKey: "sk-test-1234567890" };
    expect(byoKeyInput.safeParse(ok).success).toBe(true);
    expect(byoKeyInput.safeParse({ ...ok, provider: "https://evil.example" }).success).toBe(false);
    expect(byoKeyInput.safeParse({ ...ok, apiKey: "short" }).success).toBe(false);
    expect(byoKeyInput.safeParse({ ...ok, apiKey: "has a space inside" }).success).toBe(false);
  });

  it("keeps plan edits in range and drops unknown fields", () => {
    expect(planPatchInput.safeParse({ price_cents: -1 }).success).toBe(false);
    expect(planPatchInput.safeParse({ currency: "dollars" }).success).toBe(false);
    expect(planPatchInput.safeParse({ features: Array.from({ length: 13 }, () => "x") }).success).toBe(false);
    const parsed = planPatchInput.parse({ name: "  Plus ", currency: "inr", id: "byo", price_cents: 900 });
    expect(parsed).toEqual({ name: "Plus", currency: "inr", price_cents: 900 });
  });

  it("lets an admin set a free trial of 0 to 90 whole days", () => {
    expect(planPatchInput.parse({ trial_days: 7 })).toEqual({ trial_days: 7 });
    expect(planPatchInput.parse({ trial_days: 0 })).toEqual({ trial_days: 0 });
    expect(planPatchInput.safeParse({ trial_days: -1 }).success).toBe(false);
    expect(planPatchInput.safeParse({ trial_days: 91 }).success).toBe(false);
    expect(planPatchInput.safeParse({ trial_days: 2.5 }).success).toBe(false);
  });
});

describe("key vault", () => {
  const previous = process.env.BETTER_AUTH_SECRET;
  beforeEach(() => {
    process.env.BETTER_AUTH_SECRET = "test-secret-for-the-vault-0123456789";
  });
  afterEach(() => {
    if (previous === undefined) delete process.env.BETTER_AUTH_SECRET;
    else process.env.BETTER_AUTH_SECRET = previous;
  });

  it("round-trips a key and never stores it in the clear", () => {
    const sealed = sealKey("sk-live-abcdef", "user-1");
    expect(sealed).not.toContain("sk-live");
    expect(openKey(sealed, "user-1")).toBe("sk-live-abcdef");
  });

  it("will not open a key for another person or after tampering", () => {
    const sealed = sealKey("sk-live-abcdef", "user-1");
    expect(openKey(sealed, "user-2")).toBeNull();
    const raw = Buffer.from(sealed, "base64");
    raw[raw.length - 1] ^= 1;
    expect(openKey(raw.toString("base64"), "user-1")).toBeNull();
  });

  it("makes a different sealed value each time", () => {
    expect(sealKey("same", "u")).not.toBe(sealKey("same", "u"));
  });
});

describe("admin credit settings", () => {
  const ok = { topup_min_cents: 5_000, topup_max_cents: 1_000_000, topup_options_cents: [10_000, 50_000] };
  it("accepts whole-rupee limits with quick amounts inside them", () => {
    expect(billingSettingsInput.safeParse(ok).success).toBe(true);
  });
  it("refuses a maximum below the minimum, quick amounts outside the range and part-rupee amounts", () => {
    expect(billingSettingsInput.safeParse({ ...ok, topup_max_cents: 4_000 }).success).toBe(false);
    expect(billingSettingsInput.safeParse({ ...ok, topup_options_cents: [1_000] }).success).toBe(false);
    expect(billingSettingsInput.safeParse({ ...ok, topup_min_cents: 5_050 }).success).toBe(false);
    expect(billingSettingsInput.safeParse({ ...ok, topup_options_cents: [] }).success).toBe(false);
    expect(billingSettingsInput.safeParse({ ...ok, topup_options_cents: [6_000, 7_000, 8_000, 9_000, 10_000, 11_000, 12_000] }).success).toBe(false);
  });
  it("needs a real person and a non-zero amount to adjust credit", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    expect(creditAdjustInput.safeParse({ userId: id, amountCents: 50_000 }).success).toBe(true);
    expect(creditAdjustInput.safeParse({ userId: id, amountCents: -20_000 }).success).toBe(true);
    expect(creditAdjustInput.safeParse({ userId: id, amountCents: 0 }).success).toBe(false);
    expect(creditAdjustInput.safeParse({ userId: "nobody", amountCents: 100 }).success).toBe(false);
  });
});
