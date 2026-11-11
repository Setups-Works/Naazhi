import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "../../../config";

/**
 * Razorpay over its REST API (no SDK: three calls and two signature checks don't justify a dependency). Server only.
 * Errors from Razorpay are never passed on: they can echo request details. Callers get a generic `RazorpayError`.
 */
const API = "https://api.razorpay.com/v1";

export class RazorpayError extends Error {
  constructor(readonly status: number) {
    super(`Razorpay request failed (${status})`);
    this.name = "RazorpayError";
  }
}

export type RazorpaySubscription = {
  id: string;
  plan_id: string;
  status: "created" | "authenticated" | "active" | "pending" | "halted" | "cancelled" | "completed" | "expired" | "paused";
  /** Unix seconds; null until the first charge. */
  current_start: number | null;
  current_end: number | null;
  charge_at?: number | null;
  notes?: Record<string, string> | unknown[];
};

export const razorpayKeyId = () => serverEnv().razorpay.keyId ?? null;
export const razorpayConfigured = () => {
  const r = serverEnv().razorpay;
  return Boolean(r.keyId && r.keySecret && r.webhookSecret);
};

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const { keyId, keySecret } = serverEnv().razorpay;
  if (!keyId || !keySecret) throw new RazorpayError(0);
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new RazorpayError(res.status);
  return (await res.json()) as T;
}

export const createPlan = (p: { name: string; amount: number; currency: string; interval: "month" | "year" }) =>
  call<{ id: string }>("POST", "/plans", {
    period: p.interval === "year" ? "yearly" : "monthly",
    interval: 1,
    item: { name: p.name.slice(0, 80), amount: p.amount, currency: p.currency.toUpperCase() },
  });

export const createSubscription = (s: { planId: string; interval: "month" | "year"; userId: string }) =>
  call<RazorpaySubscription>("POST", "/subscriptions", {
    plan_id: s.planId,
    // Razorpay needs an end; this is ten years either way and a person can cancel at any time.
    total_count: s.interval === "year" ? 10 : 120,
    customer_notify: 1,
    notes: { user_id: s.userId },
  });

export type RazorpayOrder = { id: string; amount: number; currency: string; status: string; notes?: Record<string, string> | unknown[] };
export type RazorpayPayment = { id: string; order_id: string | null; amount: number; currency: string; status: string; notes?: Record<string, string> | unknown[] };

/** A one-time payment (credit top-up). The amount is in paise; `notes` carry who it is for and what it is for. */
export const createOrder = (o: { amount: number; receipt: string; notes: Record<string, string> }) =>
  call<RazorpayOrder>("POST", "/orders", { amount: o.amount, currency: "INR", receipt: o.receipt.slice(0, 40), notes: o.notes });

export const fetchPayment = (id: string) => call<RazorpayPayment>("GET", `/payments/${encodeURIComponent(id)}`);

export type RazorpayRefund = { id: string; payment_id: string; amount: number; status: string };

/** Returns money to the customer's original payment method. `amount` is in paise; the refund id makes a repeat of the same call safe to record. */
export const refundPayment = (paymentId: string, amountCents: number, notes: Record<string, string>) =>
  call<RazorpayRefund>("POST", `/payments/${encodeURIComponent(paymentId)}/refund`, { amount: amountCents, speed: "normal", notes });

export const fetchSubscription = (id: string) => call<RazorpaySubscription>("GET", `/subscriptions/${encodeURIComponent(id)}`);

/** `atCycleEnd` keeps the paid period running; otherwise it stops now. */
export const cancelSubscription = (id: string, atCycleEnd: boolean) =>
  call<RazorpaySubscription>("POST", `/subscriptions/${encodeURIComponent(id)}/cancel`, { cancel_at_cycle_end: atCycleEnd ? 1 : 0 });

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const hmac = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest("hex");

/** The checkout window hands the browser `payment_id` + `signature`; this proves Razorpay (not the browser) made them. */
export function verifyCheckoutSignature(paymentId: string, subscriptionId: string, signature: string): boolean {
  const secret = serverEnv().razorpay.keySecret;
  return Boolean(secret) && same(hmac(secret!, `${paymentId}|${subscriptionId}`), signature);
}

/** For a one-time order the checkout hands back `payment_id` + `signature` over `order_id|payment_id`. */
export function verifyOrderSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = serverEnv().razorpay.keySecret;
  return Boolean(secret) && same(hmac(secret!, `${orderId}|${paymentId}`), signature);
}

/** Webhooks are signed over the exact raw body with the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = serverEnv().razorpay.webhookSecret;
  return Boolean(secret) && same(hmac(secret!, rawBody), signature);
}
