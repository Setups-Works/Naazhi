import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { encodeForm, periodOf, verifyStripeSignature } from "../../src/server/providers/payments/stripe";
import { POST as stripeWebhook } from "../../src/app/api/webhooks/stripe/route";
import { billingSettingsInput, checkoutInput, countryInput, planPatchInput, stripeConfirmInput, topupInput } from "../../src/server/services/billing/billing.schema";

const secret = "whsec_test_secret";
const sign = (body: string, t: number, key = secret) => `t=${t},v1=${createHmac("sha256", key).update(`${t}.${body}`).digest("hex")}`;

describe("Stripe webhook signature", () => {
  const now = 1_800_000_000_000;
  const t = now / 1000;
  const body = '{"id":"evt_1","type":"invoice.paid"}';
  it("accepts a genuine, fresh signature", () => {
    expect(verifyStripeSignature(body, sign(body, t), secret, now)).toBe(true);
  });
  it("accepts when one of several v1 signatures matches (key rotation)", () => {
    expect(verifyStripeSignature(body, `${sign(body, t)},v1=${"0".repeat(64)}`, secret, now)).toBe(true);
  });
  it("refuses a changed body, the wrong secret, and a malformed or missing header", () => {
    expect(verifyStripeSignature(`${body} `, sign(body, t), secret, now)).toBe(false);
    expect(verifyStripeSignature(body, sign(body, t, "other"), secret, now)).toBe(false);
    expect(verifyStripeSignature(body, "", secret, now)).toBe(false);
    expect(verifyStripeSignature(body, "garbage", secret, now)).toBe(false);
    expect(verifyStripeSignature(body, `t=${t}`, secret, now)).toBe(false);
  });
  it("refuses a replay older than five minutes (or from the future)", () => {
    expect(verifyStripeSignature(body, sign(body, t - 301), secret, now)).toBe(false);
    expect(verifyStripeSignature(body, sign(body, t + 301), secret, now)).toBe(false);
    expect(verifyStripeSignature(body, sign(body, t - 299), secret, now)).toBe(true);
  });
  it("refuses everything when no secret is set", () => {
    expect(verifyStripeSignature(body, sign(body, t, ""), "", now)).toBe(false);
    expect(verifyStripeSignature(body, sign(body, t), undefined, now)).toBe(false);
  });
});

describe("Stripe webhook route", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.STRIPE_WEBHOOK_SECRET = secret;
  });
  afterEach(() => {
    process.env = { ...saved };
  });
  const post = (body: string, headers: Record<string, string> = {}) => stripeWebhook(new Request("http://localhost/api/webhooks/stripe", { method: "POST", body, headers }));

  it("refuses an unsigned request before parsing it", async () => {
    expect((await post("not json")).status).toBe(401);
  });
  it("refuses a request signed with the wrong secret", async () => {
    const body = '{"id":"evt_1","type":"invoice.paid"}';
    expect((await post(body, { "stripe-signature": sign(body, Math.floor(Date.now() / 1000), "wrong") })).status).toBe(401);
  });
  it("refuses a stale signed request", async () => {
    const body = '{"id":"evt_1","type":"invoice.paid"}';
    expect((await post(body, { "stripe-signature": sign(body, Math.floor(Date.now() / 1000) - 3600) })).status).toBe(401);
  });
  it("rejects a signed body that isn't JSON", async () => {
    const body = "not json";
    expect((await post(body, { "stripe-signature": sign(body, Math.floor(Date.now() / 1000)) })).status).toBe(400);
  });
});

describe("Stripe request encoding and shapes", () => {
  it("encodes nested objects and arrays the way Stripe expects", () => {
    const s = decodeURIComponent(encodeForm({ mode: "subscription", line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: 900, recurring: { interval: "month" } } }], metadata: { user_id: "u" }, skip: undefined, none: null }));
    expect(s).toBe("mode=subscription&line_items[0][quantity]=1&line_items[0][price_data][currency]=usd&line_items[0][price_data][unit_amount]=900&line_items[0][price_data][recurring][interval]=month&metadata[user_id]=u");
  });
  it("reads a subscription's period from either API shape", () => {
    expect(periodOf({ current_period_start: 1, current_period_end: 2 })).toEqual({ start: 1, end: 2 });
    expect(periodOf({ items: { data: [{ current_period_start: 3, current_period_end: 4 }] } })).toEqual({ start: 3, end: 4 });
    expect(periodOf({})).toEqual({ start: null, end: null });
  });
});

describe("country and dollar inputs", () => {
  it("normalises a country code and refuses a long name", () => {
    expect(countryInput.parse({ country: "us" }).country).toBe("US");
    expect(countryInput.safeParse({ country: "USA" }).success).toBe(false);
  });
  it("only accepts a Stripe checkout session id", () => {
    expect(stripeConfirmInput.safeParse({ sessionId: "cs_test_a1B2" }).success).toBe(true);
    expect(stripeConfirmInput.safeParse({ sessionId: "pi_123" }).success).toBe(false);
    expect(stripeConfirmInput.safeParse({ sessionId: "cs_x/../y" }).success).toBe(false);
    expect(stripeConfirmInput.safeParse({ subscriptionId: "sub_1A" }).success).toBe(true);
    expect(stripeConfirmInput.safeParse({ paymentIntentId: "pi_3A" }).success).toBe(true);
    expect(stripeConfirmInput.safeParse({ paymentIntentId: "sub_3A" }).success).toBe(false);
    expect(stripeConfirmInput.safeParse({ sessionId: "cs_1", paymentIntentId: "pi_1" }).success).toBe(false);
    expect(stripeConfirmInput.safeParse({}).success).toBe(false);
  });
  it("says where to return to, web by default", () => {
    expect(checkoutInput.parse({ planId: "subscription" }).client).toBe("web");
    expect(checkoutInput.parse({ planId: "subscription", client: "app" }).client).toBe("app");
    expect(topupInput.parse({ amountCents: 500 }).client).toBe("web");
  });
  it("lets an admin set dollar prices", () => {
    expect(planPatchInput.safeParse({ price_cents_usd: 900, token_price_cents_per_million_usd: 240 }).success).toBe(true);
    expect(planPatchInput.safeParse({ price_cents_usd: -1 }).success).toBe(false);
  });
  it("checks top-up limits in both currencies", () => {
    const ok = { topup_min_cents: 5_000, topup_max_cents: 1_000_000, topup_options_cents: [10_000], topup_min_cents_usd: 500, topup_max_cents_usd: 50_000, topup_options_cents_usd: [1_000, 2_500] };
    expect(billingSettingsInput.safeParse(ok).success).toBe(true);
    expect(billingSettingsInput.safeParse({ ...ok, topup_max_cents_usd: 100 }).success).toBe(false);
    expect(billingSettingsInput.safeParse({ ...ok, topup_options_cents_usd: [100_000] }).success).toBe(false);
    expect(billingSettingsInput.safeParse({ ...ok, topup_min_cents_usd: 550 }).success).toBe(false);
  });
});
