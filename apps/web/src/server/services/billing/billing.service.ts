import "server-only";
import type { BillingPlan, MyBilling, PlanId } from "@untitled/types";
import { addMonths, byoProvider, tokenCostCents } from "@untitled/logic/billing";
import { isEnabled } from "../../../config/features";
import * as razorpay from "../../providers/payments/razorpay";
import type { RazorpaySubscription } from "../../providers/payments/razorpay";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../../errors";
import * as repo from "../../repositories/billing.repository";
import type { UserBillingRow } from "../../repositories/billing.repository";
import { openKey, sealKey } from "./keyVault";
import type { PlanPatchInput } from "./billing.schema";
import type { CheckoutSession } from "@untitled/types";

/**
 * Plans and billing rules. People choose, switch and cancel their own plan here; admins edit plans and assign plans through the
 * `admin*` functions (the admin panel checks the caller first). No payment provider is connected yet (`payments` is off), so a
 * change is recorded and applies at once and nobody is charged.
 *
 * Rules: no plan chosen = AI works as before and use is only counted; Subscription = AI up to the plan's token allowance each period;
 * Pay as you go = AI with every token counted and priced; Bring your own key = AI through the person's own key, never counted.
 * A subscription cancels at the end of its period; the other plans stop at once. Plans renew a month at a time, and a lapsed
 * period rolls forward the next time anything reads it.
 */

const now = () => new Date();
/** Payments are live only when the switch is on AND all three Razorpay secrets are set; otherwise plans are free to switch, as before. */
export const paymentsLive = () => isEnabled("payments") && razorpay.razorpayConfigured();
const isPaid = (plan: Pick<BillingPlan, "id" | "price_cents" | "interval">) => plan.id === "subscription" && plan.price_cents > 0 && plan.interval !== "none";
const iso = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString() : null);
const PROVIDER_DOWN = "We couldn’t reach our payment provider. Nothing was charged. Try again in a moment.";
/** Only a subscription has billing periods: a month or a year long. The other plans run until they are cancelled. */
const periodEnd = (plan: Pick<BillingPlan, "id" | "interval">, from: Date) =>
  plan.id !== "subscription" || plan.interval === "none" ? null : addMonths(from, plan.interval === "year" ? 12 : 1);

/** The person's plan row with an ended period settled: a cancelled subscription lapses, anything else renews. */
async function settled(userId: string): Promise<UserBillingRow | null> {
  const row = await repo.getUserBilling(userId);
  if (!row || row.status !== "active" || !row.period_end || new Date(row.period_end) > now()) return row;
  const end = new Date(row.period_end);
  // A plan paid through Razorpay renews and ends on the provider's word (the webhook), not on our clock.
  if (row.provider_subscription_id && !row.cancel_at_period_end) return row;
  if (row.cancel_at_period_end) {
    const next = { ...row, status: "canceled" as const, canceled_at: end.toISOString(), cancel_at_period_end: false };
    await repo.saveUserBilling(userId, next);
    return next;
  }
  const plan = await repo.getPlan(row.plan_id);
  const step = plan?.interval === "year" ? 12 : 1;
  let start = end;
  let stop = addMonths(start, step);
  while (stop <= now()) {
    start = stop;
    stop = addMonths(start, step);
  }
  const next = { ...row, period_start: start.toISOString(), period_end: stop.toISOString() };
  await repo.saveUserBilling(userId, next);
  return next;
}

export const listPublicPlans = () => repo.listPlans({ activeOnly: true });

export async function getMyBilling(userId: string): Promise<MyBilling> {
  const [row, plans, key] = await Promise.all([settled(userId), repo.listPlans({ activeOnly: false }), repo.getAiKey(userId)]);
  const live = row?.status === "active" ? row : null;
  const plan = live ? (plans.find((p) => p.id === live.plan_id) ?? null) : null;
  const since = live?.period_start ?? new Date(Date.UTC(now().getUTCFullYear(), now().getUTCMonth(), 1)).toISOString();
  const tokens = await repo.tokensSince(userId, since);
  return {
    plans: plans.filter((p) => p.active),
    plan,
    status: row ? row.status : "none",
    period_start: live?.period_start ?? null,
    period_end: live?.period_end ?? null,
    cancel_at_period_end: live?.cancel_at_period_end ?? false,
    tokens_used: tokens,
    cost_cents: plan?.id === "payg" ? tokenCostCents(tokens, plan.token_price_cents_per_million) : 0,
    byo: { provider: key?.provider ?? null, model: key?.model ?? null, hint: key?.key_hint ?? null },
    payments_connected: paymentsLive(),
  };
}

async function activate(userId: string, planId: PlanId, opts: { requireActive: boolean }) {
  const plan = await repo.getPlan(planId);
  if (!plan || (opts.requireActive && !plan.active)) throw new ValidationError("That plan isn’t available.");
  const start = now();
  const end = periodEnd(plan, start);
  await repo.saveUserBilling(userId, {
    plan_id: plan.id,
    status: "active",
    period_start: start.toISOString(),
    period_end: end ? end.toISOString() : null,
    cancel_at_period_end: false,
    canceled_at: null,
    provider_subscription_id: null,
    provider_status: null,
  });
}

/** Stops a Razorpay subscription right away (used when someone moves to a plan that doesn't charge a subscription). */
async function endProviderSubscription(row: UserBillingRow | null) {
  if (!row?.provider_subscription_id || row.status !== "active") return;
  try {
    await razorpay.cancelSubscription(row.provider_subscription_id, false);
  } catch {
    throw new ConflictError(PROVIDER_DOWN);
  }
}

export async function choosePlan(userId: string, planId: PlanId): Promise<MyBilling> {
  const row = await settled(userId);
  if (row?.status === "active" && row.plan_id === planId) {
    if (!row.cancel_at_period_end) throw new ConflictError("You’re already on this plan.");
    await repo.saveUserBilling(userId, { ...row, cancel_at_period_end: false });
  } else {
    const plan = await repo.getPlan(planId);
    // A paid subscription is only ever started through checkout, where the payment happens; it is never switched on by this call.
    if (plan && paymentsLive() && isPaid(plan)) throw new ValidationError("Subscribe through checkout to start this plan.");
    await endProviderSubscription(row);
    await activate(userId, planId, { requireActive: true });
  }
  return getMyBilling(userId);
}

/** A subscription runs to the end of the period you paid for; the other plans stop now. */
export async function cancelPlan(userId: string): Promise<MyBilling> {
  const row = await settled(userId);
  if (!row || row.status !== "active") throw new ConflictError("You don’t have a plan to cancel.");
  if (row.cancel_at_period_end) throw new ConflictError("This plan is already set to cancel.");
  if (row.provider_subscription_id) {
    // Stop charging at the end of the paid period; the person keeps the plan until then.
    try {
      await razorpay.cancelSubscription(row.provider_subscription_id, true);
    } catch {
      throw new ConflictError(PROVIDER_DOWN);
    }
    await repo.saveUserBilling(userId, { ...row, cancel_at_period_end: true });
  } else if (row.period_end) await repo.saveUserBilling(userId, { ...row, cancel_at_period_end: true });
  else await repo.saveUserBilling(userId, { ...row, status: "canceled", canceled_at: now().toISOString() });
  return getMyBilling(userId);
}

export async function resumePlan(userId: string): Promise<MyBilling> {
  const row = await settled(userId);
  if (!row || row.status !== "active" || !row.cancel_at_period_end) throw new ConflictError("There’s nothing to resume.");
  // Razorpay can't undo a scheduled cancellation, so a paid plan is started again from checkout once it has ended.
  if (row.provider_subscription_id)
    throw new ConflictError("A cancelled subscription can’t be resumed. It ends on the date shown; you can subscribe again after that.");
  await repo.saveUserBilling(userId, { ...row, cancel_at_period_end: false });
  return getMyBilling(userId);
}

/* ---------- Razorpay ---------- */

/** A Razorpay plan that carries this plan's current price. Created on first use, and again whenever an admin changes the price. */
async function razorpayPlanFor(plan: BillingPlan): Promise<string> {
  const key = `${plan.price_cents}:inr:${plan.interval}`;
  const have = await repo.getPlanProvider(plan.id);
  if (have?.razorpay_plan_id && have.razorpay_plan_key === key) return have.razorpay_plan_id;
  const made = await razorpay.createPlan({ name: plan.name, amount: plan.price_cents, currency: "inr", interval: plan.interval === "year" ? "year" : "month" });
  await repo.setPlanProvider(plan.id, made.id, key);
  return made.id;
}

/** Step 1 of paying: creates the Razorpay subscription and returns what the browser needs to open the checkout window. */
export async function startCheckout(userId: string, planId: PlanId): Promise<CheckoutSession> {
  if (!paymentsLive()) throw new ConflictError("Payments aren’t switched on yet.");
  const plan = await repo.getPlan(planId);
  if (!plan || !plan.active) throw new ValidationError("That plan isn’t available.");
  if (!isPaid(plan)) throw new ValidationError("That plan doesn’t need a payment.");
  const row = await settled(userId);
  if (row?.status === "active" && row.plan_id === plan.id && row.provider_subscription_id && !row.cancel_at_period_end)
    throw new ConflictError("You’re already on this plan.");
  const keyId = razorpay.razorpayKeyId();
  if (!keyId) throw new ConflictError("Payments aren’t switched on yet.");
  try {
    const sub = await razorpay.createSubscription({
      planId: await razorpayPlanFor(plan),
      interval: plan.interval === "year" ? "year" : "month",
      userId,
    });
    const who = await repo.getContact(userId);
    return {
      key_id: keyId,
      subscription_id: sub.id,
      name: plan.name,
      description: plan.tagline,
      amount: plan.price_cents,
      currency: "INR",
      prefill: { name: who?.name ?? "", email: who?.email ?? "" },
    };
  } catch (e) {
    if (e instanceof razorpay.RazorpayError) throw new ConflictError(PROVIDER_DOWN);
    throw e;
  }
}

/**
 * Turns a Razorpay subscription's state into the person's plan row. Used by both the browser's "payment done" call and the webhook,
 * so it only ever sets absolute state and a repeat (or an old event arriving late) changes nothing.
 */
async function applySubscription(userId: string, sub: RazorpaySubscription) {
  const row = await repo.getUserBilling(userId);
  const mine = row?.provider_subscription_id === sub.id;
  if (sub.status === "active" || sub.status === "authenticated") {
    const plan = await repo.getPlan("subscription");
    if (!plan) return;
    const start = iso(sub.current_start) ?? now().toISOString();
    const end = iso(sub.current_end) ?? periodEnd(plan, new Date(start))?.toISOString() ?? null;
    // Never move a period backwards (webhooks can arrive out of order).
    const keepEnd = mine && row?.period_end && end && new Date(row.period_end) > new Date(end) ? row.period_end : end;
    const keepStart = mine && row?.period_end && keepEnd === row.period_end ? row.period_start : start;
    await repo.saveUserBilling(userId, {
      plan_id: "subscription",
      status: "active",
      period_start: keepStart,
      period_end: keepEnd,
      cancel_at_period_end: mine ? (row?.cancel_at_period_end ?? false) : false,
      canceled_at: null,
      provider_subscription_id: sub.id,
      provider_status: sub.status,
    });
    return;
  }
  if (!mine || !row) return;
  if (sub.status === "cancelled" || sub.status === "completed" || sub.status === "expired" || sub.status === "halted") {
    await repo.saveUserBilling(userId, {
      ...row,
      status: "canceled",
      cancel_at_period_end: false,
      canceled_at: row.canceled_at ?? now().toISOString(),
      provider_status: sub.status,
    });
    return;
  }
  await repo.saveUserBilling(userId, { ...row, provider_status: sub.status });
}

/** Step 2: the checkout window finished. Checks Razorpay's signature and asks Razorpay itself, so a forged call can't grant a plan. */
export async function confirmCheckout(userId: string, input: { paymentId: string; subscriptionId: string; signature: string }): Promise<MyBilling> {
  if (!razorpay.verifyCheckoutSignature(input.paymentId, input.subscriptionId, input.signature)) throw new ForbiddenError("We couldn’t verify that payment.");
  let sub: RazorpaySubscription;
  try {
    sub = await razorpay.fetchSubscription(input.subscriptionId);
  } catch {
    throw new ConflictError(PROVIDER_DOWN);
  }
  const owner = Array.isArray(sub.notes) ? undefined : sub.notes?.user_id;
  if (owner !== userId) throw new ForbiddenError("We couldn’t verify that payment.");
  const old = await repo.getUserBilling(userId);
  await applySubscription(userId, sub);
  // Moving from an earlier paid subscription: stop the old one so the person isn't charged twice.
  if (old?.provider_subscription_id && old.provider_subscription_id !== sub.id && old.status === "active")
    await razorpay.cancelSubscription(old.provider_subscription_id, false).catch(() => undefined);
  return getMyBilling(userId);
}

const SUBSCRIPTION_EVENTS = new Set([
  "subscription.authenticated",
  "subscription.activated",
  "subscription.charged",
  "subscription.updated",
  "subscription.pending",
  "subscription.halted",
  "subscription.cancelled",
  "subscription.completed",
  "subscription.expired",
]);

type WebhookEvent = {
  event?: string;
  created_at?: number;
  payload?: { subscription?: { entity?: RazorpaySubscription }; payment?: { entity?: { id?: string; subscription_id?: string | null } } };
};

/**
 * Razorpay's webhook. The route has verified the signature. Safe to receive twice or out of order: the event id is claimed once, the
 * handlers only set absolute state, and a failure gives the claim back so Razorpay's retry runs again.
 * - activated / charged: start or renew the period (autopay took the money).
 * - pending / payment.failed: a charge is being retried; the plan stays active and the status is noted.
 * - halted / cancelled / completed / expired: the plan ends.
 */
export async function handleWebhook(eventId: string, event: WebhookEvent) {
  const type = event.event ?? "";
  if (!(await repo.claimEvent(eventId, type))) return;
  try {
    const sub = event.payload?.subscription?.entity;
    const subId = sub?.id ?? event.payload?.payment?.entity?.subscription_id ?? null;
    if (!subId) return;
    const noted = sub && !Array.isArray(sub.notes) ? sub.notes?.user_id : undefined;
    const userId = (await repo.userIdForSubscription(subId)) ?? (noted && /^[0-9a-f-]{36}$/i.test(noted) ? noted : null);
    if (!userId) return;
    if (type === "payment.failed") return void (await repo.setProviderStatus(userId, subId, "payment_failed"));
    if (sub && SUBSCRIPTION_EVENTS.has(type)) await applySubscription(userId, sub);
  } catch (e) {
    await repo.releaseEvent(eventId).catch(() => undefined);
    throw e;
  }
}

export async function saveByoKey(userId: string, input: { provider: string; model: string; apiKey: string }): Promise<MyBilling> {
  const preset = byoProvider(input.provider);
  if (!preset) throw new ValidationError("Choose one of the listed providers.");
  const row = await settled(userId);
  if (row?.status !== "active" || row.plan_id !== "byo") throw new ConflictError("Choose the Bring your own key plan first.");
  await repo.saveAiKey(userId, {
    provider: preset.id,
    model: input.model,
    key_cipher: sealKey(input.apiKey, userId),
    key_hint: input.apiKey.slice(-4),
  });
  return getMyBilling(userId);
}

export async function removeByoKey(userId: string): Promise<MyBilling> {
  await repo.deleteAiKey(userId);
  return getMyBilling(userId);
}

export type AiAccess = {
  mode: "server" | "byo";
  planId: PlanId | null;
  /** For the own-key plan: the sealed key opened for this one request, the provider's fixed address and the chosen model. */
  byo?: { apiKey: string; baseUrl: string; model: string; provider: string };
  /** Counts the tokens an answer used (a no-op on the own-key plan). */
  record: (usage: { inputTokens: number; outputTokens: number }, provider: string) => Promise<void>;
};

/**
 * What a person's plan allows for one AI request. Throws a ServiceError with a friendly message when it doesn't allow it
 * (allowance used up, own key missing), so the AI services can stop before calling any provider.
 */
export async function aiAccessFor(userId: string): Promise<AiAccess> {
  const row = await settled(userId);
  const planId = row?.status === "active" ? row.plan_id : null;
  const count = (usage: { inputTokens: number; outputTokens: number }, provider: string) =>
    repo.addUsage(userId, planId, provider, usage.inputTokens, usage.outputTokens).catch(() => undefined);

  if (planId === "byo") {
    const key = await repo.getAiKey(userId);
    if (!key) throw new ForbiddenError("Add your API key in Settings → Plan and billing to use AI.");
    const apiKey = openKey(key.key_cipher, userId);
    const preset = byoProvider(key.provider);
    if (!apiKey || !preset) throw new ForbiddenError("Your saved API key couldn’t be used. Enter it again in Settings → Plan and billing.");
    return { mode: "byo", planId, byo: { apiKey, baseUrl: preset.baseUrl, model: key.model, provider: preset.id }, record: async () => undefined };
  }
  if (planId === "subscription" && row) {
    const plan = await repo.getPlan("subscription");
    if (plan && plan.included_tokens > 0 && (await repo.tokensSince(userId, row.period_start)) >= plan.included_tokens)
      throw new ForbiddenError("You’ve used this period’s AI allowance. Switch to pay as you go or bring your own key in Settings → Plan and billing.");
  }
  return { mode: "server", planId, record: count };
}

// ---- Admin. Callers (app/admin) check the admin first and write the audit entry. ----

export async function adminOverview() {
  const [plans, totals, subscribers, tokens30d] = await Promise.all([
    repo.listPlans({ activeOnly: false }),
    repo.planTotals(),
    repo.listSubscribers(),
    repo.usageTotal30d(),
  ]);
  return { plans, totals, subscribers, tokens30d };
}

export async function adminUpdatePlan(id: string, patch: PlanPatchInput) {
  const updated = await repo.updatePlan(id, patch);
  if (!updated) throw new NotFoundError("That plan doesn’t exist.");
  return updated;
}

/** Puts a person on a plan (or off every plan with null). Inactive plans can still be assigned by an admin. */
export async function adminSetUserPlan(userId: string, planId: PlanId | null) {
  if (planId === null) return repo.clearUserBilling(userId);
  await activate(userId, planId, { requireActive: false });
}
