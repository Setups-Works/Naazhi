import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "../../../config";

/**
 * Stripe over its REST API (no SDK, like Razorpay: a handful of calls and one signature check). Server only.
 * People pay on Stripe's own hosted Checkout page, so card details never touch our servers and no publishable key is needed.
 * Errors from Stripe are never passed on (they can echo request details); callers get a generic `StripeError`.
 */
const API = "https://api.stripe.com/v1";
/** Requests are pinned to one API version so the shapes below don't change under us. Create the webhook endpoint with this version too. */
export const STRIPE_API_VERSION = "2024-06-20";

export class StripeError extends Error {
  constructor(readonly status: number) {
    super(`Stripe request failed (${status})`);
    this.name = "StripeError";
  }
}

export const stripeConfigured = () => {
  const s = serverEnv().stripe;
  return Boolean(s.secretKey && s.webhookSecret);
};

/** "sk_test_…" is test mode, "sk_live_…" live; never the key itself. */
export const stripeMode = (): "test" | "live" | null => {
  const k = serverEnv().stripe.secretKey;
  return k ? (k.startsWith("sk_live_") || k.startsWith("rk_live_") ? "live" : "test") : null;
};

export type StripeSubscription = {
  id: string;
  status: "incomplete" | "incomplete_expired" | "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "paused";
  /** Unix seconds. Older API versions put these on the subscription, newer ones on its first item; `periodOf` reads both. */
  current_period_start?: number | null;
  current_period_end?: number | null;
  items?: { data?: { current_period_start?: number | null; current_period_end?: number | null }[] };
  cancel_at_period_end: boolean;
  trial_end?: number | null;
  metadata?: Record<string, string>;
  latest_invoice?: string | (Omit<StripeInvoice, "payment_intent"> & { payment_intent?: StripeIntent | string | null }) | null;
  pending_setup_intent?: StripeIntent | string | null;
};

export type StripeIntent = { id: string; status?: string; client_secret?: string | null; amount?: number; currency?: string; metadata?: Record<string, string> };

export type StripeSession = {
  id: string;
  mode: "payment" | "subscription" | "setup";
  status: "open" | "complete" | "expired" | null;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  client_reference_id: string | null;
  metadata?: Record<string, string> | null;
  subscription?: string | null;
  payment_intent?: string | null;
  invoice?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  url?: string | null;
};

export type StripeInvoice = {
  id: string;
  subscription?: string | null;
  payment_intent?: string | null;
  amount_paid: number;
  currency: string;
  period_start?: number | null;
  period_end?: number | null;
  lines?: { data?: { period?: { start?: number; end?: number } }[] };
};

export type StripeRefund = { id: string; amount: number; currency?: string; status: string | null; payment_intent: string | null };

/** The billing period of a subscription as Unix seconds, whichever API shape carries it. */
export function periodOf(sub: Pick<StripeSubscription, "current_period_start" | "current_period_end" | "items">): { start: number | null; end: number | null } {
  const item = sub.items?.data?.[0];
  return { start: sub.current_period_start ?? item?.current_period_start ?? null, end: sub.current_period_end ?? item?.current_period_end ?? null };
}

/** Stripe wants form-encoded bodies with bracketed keys: `{ a: { b: 1 } }` → `a[b]=1`, arrays → `a[0]=…`. */
export function encodeForm(obj: Record<string, unknown>): string {
  const out: string[] = [];
  const walk = (prefix: string, v: unknown) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) v.forEach((x, i) => walk(`${prefix}[${i}]`, x));
    else if (typeof v === "object") for (const [k, x] of Object.entries(v as Record<string, unknown>)) walk(`${prefix}[${k}]`, x);
    else out.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(v))}`);
  };
  for (const [k, v] of Object.entries(obj)) walk(k, v);
  return out.join("&");
}

/** Says why a Stripe call failed without leaking anything: the status, Stripe's short error code and the route, never keys, bodies or messages. */
function logFailure(method: string, path: string, status: number, code: string | null) {
  console.error("[stripe] request failed", { method, route: path.split("?")[0]!.replace(/\/(cs|sub|in|pi|re|ch)_[A-Za-z0-9_]+/g, "/:id"), status, code });
}

async function call<T>(method: "GET" | "POST" | "DELETE", path: string, body?: Record<string, unknown>): Promise<T> {
  const key = serverEnv().stripe.secretKey;
  if (!key) {
    logFailure(method, path, 0, "keys_missing");
    throw new StripeError(0);
  }
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded", "stripe-version": STRIPE_API_VERSION },
      body: body ? encodeForm(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    logFailure(method, path, 0, e instanceof Error ? e.name : "network_error");
    throw new StripeError(0);
  }
  if (!res.ok) {
    const code = await res
      .json()
      .then((j: { error?: { code?: unknown; type?: unknown } }) => (typeof j?.error?.code === "string" ? j.error.code : typeof j?.error?.type === "string" ? j.error.type : null))
      .catch(() => null);
    logFailure(method, path, res.status, code);
    throw new StripeError(res.status);
  }
  return (await res.json()) as T;
}

type CheckoutBase = {
  userId: string;
  email: string;
  productName: string;
  amountCents: number;
  /** Where Stripe sends the person afterwards. `{CHECKOUT_SESSION_ID}` in the success URL is filled in by Stripe. */
  successUrl: string;
  cancelUrl: string;
};

const common = (c: CheckoutBase, kind: "subscription" | "topup") => ({
  client_reference_id: c.userId,
  ...(c.email ? { customer_email: c.email } : {}),
  metadata: { user_id: c.userId, kind },
  success_url: c.successUrl,
  cancel_url: c.cancelUrl,
  ...(serverEnv().stripe.automaticTax ? { automatic_tax: { enabled: true }, billing_address_collection: "required" } : {}),
});

/** A subscription on Stripe's hosted page. The price is sent inline, so an admin's price change needs no product set up in Stripe. */
export const createSubscriptionCheckout = (c: CheckoutBase & { interval: "month" | "year"; trialDays: number }) =>
  call<StripeSession>("POST", "/checkout/sessions", {
    mode: "subscription",
    ...common(c, "subscription"),
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: c.amountCents, recurring: { interval: c.interval }, product_data: { name: c.productName.slice(0, 80) } } }],
    subscription_data: { metadata: { user_id: c.userId }, ...(c.trialDays > 0 ? { trial_period_days: c.trialDays } : {}) },
  });

/** A one-time payment for AI credit. The user id rides on the payment itself too, so a refund can be traced back to the person. */
export const createTopupCheckout = (c: CheckoutBase) =>
  call<StripeSession>("POST", "/checkout/sessions", {
    mode: "payment",
    ...common(c, "topup"),
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: c.amountCents, product_data: { name: c.productName.slice(0, 80) } } }],
    payment_intent_data: { metadata: { user_id: c.userId, kind: "topup" } },
  });

export const fetchSession = (id: string) => call<StripeSession>("GET", `/checkout/sessions/${encodeURIComponent(id)}`);
export const fetchSubscription = (id: string) => call<StripeSubscription>("GET", `/subscriptions/${encodeURIComponent(id)}`);
/** The subscription with its first invoice and payment (or setup) intent opened up, as the phone sheet's return trip needs. */
export const fetchSubscriptionExpanded = (id: string) =>
  call<StripeSubscription>("GET", `/subscriptions/${encodeURIComponent(id)}?expand[]=latest_invoice&expand[]=pending_setup_intent`);
export const fetchPaymentIntent = (id: string) => call<StripeIntent>("GET", `/payment_intents/${encodeURIComponent(id)}`);
export const fetchInvoice = (id: string) => call<StripeInvoice>("GET", `/invoices/${encodeURIComponent(id)}`);

/** Keeps the paid period running and stops the next charge (also during a free trial); `false` takes it back. */
export const setCancelAtPeriodEnd = (id: string, cancel: boolean) =>
  call<StripeSubscription>("POST", `/subscriptions/${encodeURIComponent(id)}`, { cancel_at_period_end: cancel });

/** Stops a subscription right away (used when someone moves to a plan that doesn't charge a subscription). */
export const cancelNow = (id: string) => call<StripeSubscription>("DELETE", `/subscriptions/${encodeURIComponent(id)}`);

/** Returns money to the original payment method. The invoice number rides along as metadata. */
export const refundPayment = (paymentIntentId: string, amountCents: number, metadata: Record<string, string>) =>
  call<StripeRefund>("POST", "/refunds", { payment_intent: paymentIntentId, amount: amountCents, metadata });

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Checks a webhook's `Stripe-Signature` header (`t=<unix>,v1=<hex>[,v1=…]`): an HMAC-SHA256 of `<t>.<raw body>` with the signing secret.
 * Refuses anything signed more than five minutes from `now`, so a captured request can't be replayed later. Pure, for tests.
 */
export function verifyStripeSignature(raw: string, header: string, secret: string | null | undefined, now = Date.now()): boolean {
  if (!secret || !header) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = parts.find(([k]) => k === "t")?.[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v ?? "");
  if (!t || !/^\d+$/.test(t) || !sigs.length) return false;
  if (Math.abs(now / 1000 - Number(t)) > 300) return false;
  const want = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  return sigs.some((s) => same(want, s));
}

export const verifyWebhookSignature = (raw: string, header: string) => verifyStripeSignature(raw, header, serverEnv().stripe.webhookSecret);

/* ---------- native payment sheet (phone app) ---------- */

export const createCustomer = (c: { userId: string; email: string; name: string }) =>
  call<{ id: string }>("POST", "/customers", { ...(c.email ? { email: c.email } : {}), ...(c.name ? { name: c.name } : {}), metadata: { user_id: c.userId } });

/** A short-lived secret that lets the sheet show and save this customer's cards (and nothing else). */
export const createCustomerSession = (customerId: string) =>
  call<{ client_secret: string }>("POST", "/customer_sessions", {
    customer: customerId,
    components: { mobile_payment_element: { enabled: true, features: { payment_method_save: "enabled", payment_method_redisplay: "enabled", payment_method_remove: "disabled" } } },
  });

export const createProduct = (name: string) => call<{ id: string }>("POST", "/products", { name: name.slice(0, 80) });

/**
 * A subscription that waits for the sheet to collect the card: it starts `incomplete` and becomes active when the first payment is
 * made. With a free trial there is nothing to pay yet, so Stripe returns a setup intent to save the card instead.
 */
export const createSheetSubscription = (s: { customerId: string; userId: string; productId: string; amountCents: number; interval: "month" | "year"; trialDays: number }) =>
  call<StripeSubscription>("POST", "/subscriptions", {
    customer: s.customerId,
    items: [{ quantity: 1, price_data: { currency: "usd", product: s.productId, unit_amount: s.amountCents, recurring: { interval: s.interval } } }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice.payment_intent", "pending_setup_intent"],
    metadata: { user_id: s.userId },
    ...(s.trialDays > 0 ? { trial_period_days: s.trialDays } : {}),
  });

export const createTopupIntent = (t: { customerId: string; userId: string; amountCents: number }) =>
  call<StripeIntent>("POST", "/payment_intents", {
    amount: t.amountCents,
    currency: "usd",
    customer: t.customerId,
    automatic_payment_methods: { enabled: true },
    metadata: { user_id: t.userId, kind: "topup" },
  });
