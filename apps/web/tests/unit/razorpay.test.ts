import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifyCheckoutSignature, verifyOrderSignature, verifyWebhookSignature } from "../../src/server/providers/payments/razorpay";
import { checkoutConfirmInput, planPatchInput, topupConfirmInput, topupInput } from "../../src/server/services/billing/billing.schema";

const sign = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest("hex");

describe("Razorpay signatures", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_x";
    process.env.RAZORPAY_KEY_SECRET = "key-secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = "hook-secret";
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it("accepts a checkout signature over payment|subscription and refuses a changed one", () => {
    const sig = sign("key-secret", "pay_1|sub_1");
    expect(verifyCheckoutSignature("pay_1", "sub_1", sig)).toBe(true);
    expect(verifyCheckoutSignature("pay_1", "sub_2", sig)).toBe(false);
    expect(verifyCheckoutSignature("pay_1", "sub_1", "short")).toBe(false);
  });

  it("verifies a top-up signature over order|payment, not payment|subscription", () => {
    const sig = sign("key-secret", "order_1|pay_1");
    expect(verifyOrderSignature("order_1", "pay_1", sig)).toBe(true);
    expect(verifyOrderSignature("order_2", "pay_1", sig)).toBe(false);
    expect(verifyCheckoutSignature("pay_1", "order_1", sig)).toBe(false);
  });

  it("verifies a webhook over the exact raw body with the webhook secret", () => {
    const body = '{"event":"subscription.charged"}';
    expect(verifyWebhookSignature(body, sign("hook-secret", body))).toBe(true);
    expect(verifyWebhookSignature(`${body} `, sign("hook-secret", body))).toBe(false);
    expect(verifyWebhookSignature(body, sign("key-secret", body))).toBe(false);
  });

  it("refuses everything when no secret is set", () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    expect(verifyWebhookSignature("{}", sign("", "{}"))).toBe(false);
  });
});

describe("Razorpay inputs and rupees-only", () => {
  it("requires all three confirm fields", () => {
    expect(checkoutConfirmInput.safeParse({ paymentId: "p", subscriptionId: "s", signature: "x" }).success).toBe(true);
    expect(checkoutConfirmInput.safeParse({ paymentId: "p", subscriptionId: "s" }).success).toBe(false);
  });
  it("accepts only INR for a plan", () => {
    expect(planPatchInput.safeParse({ currency: "inr" }).success).toBe(true);
    expect(planPatchInput.safeParse({ currency: "usd" }).success).toBe(false);
  });
});

describe("top-up inputs", () => {
  it("needs an integer amount and all confirm fields", () => {
    expect(topupInput.safeParse({ amountCents: 10_000 }).success).toBe(true);
    expect(topupInput.safeParse({ amountCents: 10.5 }).success).toBe(false);
    expect(topupInput.safeParse({ amountCents: "100" }).success).toBe(false);
    expect(topupConfirmInput.safeParse({ paymentId: "p", orderId: "o", signature: "s" }).success).toBe(true);
    expect(topupConfirmInput.safeParse({ paymentId: "p", orderId: "o" }).success).toBe(false);
  });
});
