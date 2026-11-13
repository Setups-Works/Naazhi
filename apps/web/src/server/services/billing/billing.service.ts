import "server-only";
import type { BillingPlan, MyBilling, PlanId } from "@untitled/types";
import { addMonths, byoProvider, TOPUP, tokenCostCents, validTopup, type TopupLimits } from "@untitled/logic/billing";
import { isEnabled } from "../../../config/features";
import { serverEnv } from "../../../config/env";
import * as razorpay from "../../providers/payments/razorpay";
import type { RazorpaySubscription } from "../../providers/payments/razorpay";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../../errors";
import * as repo from "../../repositories/billing.repository";
import type { UserBillingRow } from "../../repositories/billing.repository";
import { openKey, sealKey } from "./keyVault";
import { getSeller, issueInvoice, notifyBilling, recordRefund } from "./invoices.service";
import { templates } from "../../email/templates";
import type { PlanPatchInput } from "./billing.schema";
import type { CheckoutSession, TopupSession } from "@untitled/types";

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
/** The top-up limits: the admin's settings, or the built-in defaults when the settings row isn't there. */
export async function getTopupLimits(): Promise<TopupLimits> {
  const s = await repo.getSettings().catch(() => null);
  return s ? { minCents: s.topup_min_cents, maxCents: s.topup_max_cents, optionsCents: s.topup_options_cents } : { ...TOPUP };
}
/** A subscription whose first charge is still in the future is on its free trial. */
const onTrial = (sub: Pick<RazorpaySubscription, "status" | "start_at">) => sub.status === "authenticated" && !!sub.start_at && sub.start_at * 1000 > Date.now() + 60_000;
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
  const subPlan = plans.find((p) => p.id === "subscription" && p.active);
  const trialAvailable = !!subPlan && subPlan.trial_days > 0 && paymentsLive() && !(await repo.hasUsedTrial(userId));
  const since = live?.period_start ?? new Date(Date.UTC(now().getUTCFullYear(), now().getUTCMonth(), 1)).toISOString();
  const [tokens, credit, creditTotal, limits] = await Promise.all([repo.tokensSince(userId, since), repo.getCredit(userId), repo.getCreditTotal(userId), getTopupLimits()]);
  return {
    plans: plans.filter((p) => p.active),
    plan,
    status: row ? row.status : "none",
    period_start: live?.period_start ?? null,
    period_end: live?.period_end ?? null,
    cancel_at_period_end: live?.cancel_at_period_end ?? false,
    trial_ends_at: live?.trial_ends_at && new Date(live.trial_ends_at) > now() ? live.trial_ends_at : null,
    trial_available: trialAvailable,
    tokens_used: tokens,
    cost_cents: plan?.id === "payg" ? tokenCostCents(tokens, plan.token_price_cents_per_million) : 0,
    byo: { provider: key?.provider ?? null, model: key?.model ?? null, hint: key?.key_hint ?? null },
    payments_connected: paymentsLive(),
    credit_cents: credit,
    credit_total_cents: creditTotal,
    topup: { min_cents: limits.minCents, max_cents: limits.maxCents, options_cents: [...limits.optionsCents] },
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
    trial_ends_at: null,
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
    // Stop charging at the end of the paid period (or, during a free trial, before the first one); the person keeps the plan until then.
    // A subscription that hasn't started charging can only be cancelled at once, so a trial is cancelled now and kept until it ends.
    const trialing = !!row.trial_ends_at && new Date(row.trial_ends_at) > now();
    try {
      await razorpay.cancelSubscription(row.provider_subscription_id, !trialing);
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
  // One free trial per person, ever: the first charge is pushed back by the plan's trial days.
  const trialDays = plan.trial_days > 0 && !(await repo.hasUsedTrial(userId)) ? plan.trial_days : 0;
  try {
    const sub = await razorpay.createSubscription({
      planId: await razorpayPlanFor(plan),
      interval: plan.interval === "year" ? "year" : "month",
      userId,
      startAt: trialDays ? Math.floor(Date.now() / 1000) + trialDays * 86_400 : undefined,
    });
    const who = await repo.getContact(userId);
    return {
      key_id: keyId,
      subscription_id: sub.id,
      name: plan.name,
      description: plan.tagline,
      amount: plan.price_cents,
      currency: "INR",
      trial_days: trialDays,
      prefill: { name: who?.name ?? "", email: who?.email ?? "", ...(who?.phone ? { contact: who.phone } : {}) },
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
    // A free trial: no charge yet, so the period runs from now to the day the first payment is taken.
    const trial = onTrial(sub) ? iso(sub.start_at) : null;
    const start = trial ? now().toISOString() : (iso(sub.current_start) ?? now().toISOString());
    const end = trial ?? iso(sub.current_end) ?? periodEnd(plan, new Date(start))?.toISOString() ?? null;
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
      trial_ends_at: trial,
    });
    return;
  }
  if (!mine || !row) return;
  // Cancelled during a free trial: Razorpay stops billing at once, but the person keeps the trial until it ends.
  if (sub.status === "cancelled" && row.cancel_at_period_end && row.period_end && new Date(row.period_end) > now()) {
    await repo.saveUserBilling(userId, { ...row, provider_status: sub.status });
    return;
  }
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

/**
 * The invoice (and emailed receipt) for one subscription charge. Made from two places, whichever comes first: the browser's "payment
 * done" call and Razorpay's `subscription.charged` webhook. An invoice is unique per payment, so the second caller changes nothing and
 * the person gets one receipt. Without the first path, a webhook that was never set up or never delivered meant no invoice and no email.
 */
async function issueSubscriptionInvoice(userId: string, sub: RazorpaySubscription, paymentId: string, amountCents: number) {
  const plan = await repo.getPlan("subscription");
  await issueInvoice({
    userId,
    kind: "subscription",
    description: `${plan?.name ?? "Subscription"}, ${plan?.interval === "year" ? "yearly" : "monthly"}`,
    amountCents,
    paymentId,
    ref: sub.id,
    periodStart: iso(sub.current_start),
    periodEnd: iso(sub.current_end),
  });
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
  const trial = onTrial(sub);
  await applySubscription(userId, sub);
  // The trial is spent the moment it starts (not when checkout opens), so closing the window doesn't burn it.
  if (trial) await repo.markTrialUsed(userId, "subscription", sub.id).catch(() => undefined);
  // The first charge has just been taken: invoice it now instead of waiting for the webhook. Razorpay itself says what was paid; a
  // payment that isn't captured yet is invoiced later by the webhook.
  // During a trial the only payment is Razorpay's small refundable card or UPI check, which is not a charge and gets no invoice.
  try {
    if (trial) throw new Error("trial");
    const pay = await razorpay.fetchPayment(input.paymentId);
    if (pay.status === "captured" && pay.currency === "INR" && Number.isInteger(pay.amount) && pay.amount > 0) await issueSubscriptionInvoice(userId, sub, pay.id, pay.amount);
  } catch {
    /* the webhook will invoice it; a receipt problem must never fail a payment that went through */
  }
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
  payload?: { refund?: { entity?: { id?: string; payment_id?: string; amount?: number } }; subscription?: { entity?: RazorpaySubscription }; payment?: { entity?: { id?: string; subscription_id?: string | null; amount?: number; currency?: string; notes?: Record<string, string> | unknown[] } } };
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
    // A refund (made by an admin here, or in Razorpay's own dashboard): applied to its invoice once, whichever path reports it first.
    if (type === "refund.processed") {
      const rf = event.payload?.refund?.entity;
      if (rf?.id && rf.payment_id && typeof rf.amount === "number") await recordRefund(rf.id, rf.payment_id, rf.amount);
      return;
    }
    // A captured one-time payment for a credit top-up (subscription charges also arrive as payment.captured and are ignored here).
    if (type === "payment.captured") {
      const pay = event.payload?.payment?.entity;
      const notes = pay && !Array.isArray(pay.notes) ? pay.notes : undefined;
      if (pay?.id && notes?.kind === "topup" && notes.user_id && /^[0-9a-f-]{36}$/i.test(notes.user_id)) await creditPayment(notes.user_id, pay.id);
      return;
    }
    const sub = event.payload?.subscription?.entity;
    const subId = sub?.id ?? event.payload?.payment?.entity?.subscription_id ?? null;
    if (!subId) return;
    const noted = sub && !Array.isArray(sub.notes) ? sub.notes?.user_id : undefined;
    const userId = (await repo.userIdForSubscription(subId)) ?? (noted && /^[0-9a-f-]{36}$/i.test(noted) ? noted : null);
    if (!userId) return;
    if (type === "payment.failed") {
      await repo.setProviderStatus(userId, subId, "payment_failed");
      await notifyBilling(userId, (url) => templates.paymentFailed({ url }));
      return;
    }
    if (sub && SUBSCRIPTION_EVENTS.has(type)) await applySubscription(userId, sub);
    // A charge was taken (the first one and every renewal): that is what the invoice is for.
    const pay = event.payload?.payment?.entity;
    if (type === "subscription.charged" && sub && pay?.id && typeof pay.amount === "number" && pay.amount > 0) {
      await issueSubscriptionInvoice(userId, sub, pay.id, pay.amount).catch(() => undefined);
    }
    // The subscription is over (cancelled, ran its course, or stopped after failed payments).
    if (type === "subscription.cancelled" || type === "subscription.completed" || type === "subscription.expired" || type === "subscription.halted") {
      const plan = await repo.getPlan("subscription");
      await notifyBilling(userId, (url) => templates.subscriptionEnded({ planName: plan?.name ?? "Subscription", url }));
    }
  } catch (e) {
    await repo.releaseEvent(eventId).catch(() => undefined);
    throw e;
  }
}

/* ---------- AI credit top-ups (one-time Razorpay payments) ---------- */

/** Step 1 of a top-up: creates a Razorpay order for the amount and returns what the checkout window needs. */
export async function startTopup(userId: string, amountCents: number): Promise<TopupSession> {
  if (!paymentsLive()) throw new ConflictError("Payments aren’t switched on yet.");
  const limits = await getTopupLimits();
  if (!validTopup(amountCents, limits)) throw new ValidationError(`Choose a whole-rupee amount from ₹${limits.minCents / 100} to ₹${limits.maxCents / 100}.`);
  const row = await settled(userId);
  if (row?.status !== "active" || row.plan_id !== "payg") throw new ConflictError("Choose the Pay as you go plan to add credit.");
  const keyId = razorpay.razorpayKeyId();
  if (!keyId) throw new ConflictError("Payments aren’t switched on yet.");
  try {
    const order = await razorpay.createOrder({ amount: amountCents, receipt: `topup_${userId.slice(0, 8)}_${Date.now()}`, notes: { user_id: userId, kind: "topup" } });
    const who = await repo.getContact(userId);
    return { key_id: keyId, order_id: order.id, amount: amountCents, currency: "INR", name: "Naazhi AI credit", description: "Pay as you go", prefill: { name: who?.name ?? "", email: who?.email ?? "", ...(who?.phone ? { contact: who.phone } : {}) } };
  } catch (e) {
    if (e instanceof razorpay.RazorpayError) throw new ConflictError(PROVIDER_DOWN);
    throw e;
  }
}

/**
 * Adds a captured top-up payment to the balance, once. Used by the browser's "payment done" call and the webhook, so it checks with
 * Razorpay itself that the payment is captured, is for a top-up and belongs to this person; the ledger's unique payment id means a repeat
 * (or both paths arriving) changes nothing.
 */
async function creditPayment(userId: string, paymentId: string): Promise<boolean> {
  let pay: razorpay.RazorpayPayment;
  try {
    pay = await razorpay.fetchPayment(paymentId);
  } catch {
    throw new ConflictError(PROVIDER_DOWN);
  }
  const notes = Array.isArray(pay.notes) ? {} : (pay.notes ?? {});
  if (pay.status !== "captured" || pay.currency !== "INR" || notes.kind !== "topup" || notes.user_id !== userId) return false;
  // A captured payment is credited whatever the limits are now: the person paid it, so an admin tightening the limits later can't strand it.
  if (!Number.isInteger(pay.amount) || pay.amount < 100) return false;
  const added = (await repo.applyCredit(userId, pay.amount, "topup", { ref: paymentId })) !== null;
  // The invoice (and its emailed receipt) is made once, the first time this payment is credited.
  if (added) await issueInvoice({ userId, kind: "topup", description: "AI credit top-up", amountCents: pay.amount, paymentId, ref: pay.order_id }).catch(() => undefined);
  return added;
}

/** Step 2: the checkout window finished. Verifies the signature, then credits the payment. */
export async function confirmTopup(userId: string, input: { paymentId: string; orderId: string; signature: string }): Promise<MyBilling> {
  if (!razorpay.verifyOrderSignature(input.orderId, input.paymentId, input.signature)) throw new ForbiddenError("We couldn’t verify that payment.");
  await creditPayment(userId, input.paymentId);
  return getMyBilling(userId);
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
  // Pay as you go is always prepaid: tokens come off the person's credit and AI pauses when it is gone, whether or not
  // Razorpay is connected yet (until then an admin adds credit with Adjust).
  const prepaid = planId === "payg";
  const payg = prepaid ? await repo.getPlan("payg") : null;
  const count = async (usage: { inputTokens: number; outputTokens: number }, provider: string) => {
    await repo.addUsage(userId, planId, provider, usage.inputTokens, usage.outputTokens).catch(() => undefined);
    const tokens = usage.inputTokens + usage.outputTokens;
    const cost = payg ? tokenCostCents(tokens, payg.token_price_cents_per_million) : 0;
    if (cost > 0) {
      const after = await repo.applyCredit(userId, -cost, "usage", { tokens }).catch(() => null);
      // Tell the person once, when this reply is the one that used the last of their credit.
      if (after !== null && after + cost > 0 && after <= 0) void notifyBilling(userId, (url) => templates.creditEmpty({ url }));
    }
  };
  if (prepaid && (await repo.getCredit(userId)) <= 0)
    throw new ForbiddenError(
      paymentsLive()
        ? "You’re out of AI credit. Top up in Settings → Plan and billing to keep going."
        : "You’re out of AI credit. Top-ups aren’t open yet, so ask the team to add credit, or switch plan in Settings → Plan and billing.",
    );

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
  const [plans, totals, subscribers, tokens30d, limits, seller] = await Promise.all([
    repo.listPlans({ activeOnly: false }),
    repo.planTotals(),
    repo.listSubscribers(),
    repo.usageTotal30d(),
    getTopupLimits(),
    getSeller(),
  ]);
  const r = serverEnv().razorpay;
  // Whether Razorpay is wired up, never the secrets: test or live comes from the public key id's prefix.
  const razorpayStatus = {
    live: paymentsLive(),
    keys: Boolean(r.keyId && r.keySecret),
    webhook: Boolean(r.webhookSecret),
    mode: r.keyId?.startsWith("rzp_live_") ? ("live" as const) : r.keyId ? ("test" as const) : null,
  };
  return { plans, totals, subscribers, tokens30d, limits, razorpayStatus, seller };
}

export async function adminSaveSettings(input: import("zod").infer<typeof import("./billing.schema").billingSettingsInput>) {
  const options = [...new Set(input.topup_options_cents)].sort((a, b) => a - b);
  await repo.saveSettings({ topup_min_cents: input.topup_min_cents, topup_max_cents: input.topup_max_cents, topup_options_cents: options });
}

/** Adds or removes credit for a person (support, goodwill, a correction). Written to the ledger as an adjustment; returns the new balance. */
export async function adminAdjustCredit(userId: string, amountCents: number): Promise<number> {
  const balance = await repo.applyCredit(userId, amountCents, "adjust");
  if (balance === null) throw new ConflictError("That adjustment couldn’t be applied.");
  return balance;
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
