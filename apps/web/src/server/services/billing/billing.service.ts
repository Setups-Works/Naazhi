import "server-only";
import type { BillingPlan, MyBilling, PlanId } from "@untitled/types";
import { addMonths, byoProvider, defaultTopup, localizePlan, plansFor, tokenCostCents, topupRange, validTopup, type TopupLimits } from "@untitled/logic/billing";
import { billingRegion, cleanCountry, currencyName, regionForProvider, type BillingRegion, type Currency, type PaymentProvider } from "@untitled/logic/countries";
import { isEnabled } from "../../../config/features";
import { serverEnv } from "../../../config/env";
import * as razorpay from "../../providers/payments/razorpay";
import type { RazorpaySubscription } from "../../providers/payments/razorpay";
import * as stripe from "../../providers/payments/stripe";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../../errors";
import * as repo from "../../repositories/billing.repository";
import type { UserBillingRow } from "../../repositories/billing.repository";
import { openKey, sealKey } from "./keyVault";
import { appLink, getSeller, issueInvoice, notifyBilling, recordRefund } from "./invoices.service";
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
/**
 * Payments are live for a provider only when the switch is on AND that provider's secrets are all set (Razorpay: key id, key secret,
 * webhook secret; Stripe: secret key, webhook secret). Which provider a person uses comes from their country (`billingRegion`).
 * Until their provider is live, plan changes are free and recorded, as before, and every pay button says "not available yet".
 */
export const paymentsLive = (provider: PaymentProvider = "razorpay") =>
  isEnabled("payments") && (provider === "stripe" ? stripe.stripeConfigured() : razorpay.razorpayConfigured());
const isPaid = (plan: Pick<BillingPlan, "id" | "price_cents" | "interval">) => plan.id === "subscription" && plan.price_cents > 0 && plan.interval !== "none";
const iso = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString() : null);
/** The top-up limits in a currency: the admin's settings, or the built-in defaults when the settings row isn't there. */
export async function getTopupLimits(currency: Currency = "inr"): Promise<TopupLimits> {
  const s = await repo.getSettings().catch(() => null);
  if (!s) return defaultTopup(currency);
  return currency === "usd"
    ? { minCents: s.topup_min_cents_usd, maxCents: s.topup_max_cents_usd, optionsCents: s.topup_options_cents_usd }
    : { minCents: s.topup_min_cents, maxCents: s.topup_max_cents, optionsCents: s.topup_options_cents };
}

/**
 * How this person pays right now. Normally their country decides (India: rupees, Razorpay; elsewhere: dollars, Stripe). But money
 * already in flight keeps its provider whatever the country says: someone with an active paid subscription stays with the provider
 * that bills it, and someone holding AI credit stays in the currency it is held in. `locked` says why the country can't be changed.
 */
async function regionFor(userId: string, row: UserBillingRow | null): Promise<{ region: BillingRegion; country: string | null; locked: string | null }> {
  const [country, credit] = await Promise.all([repo.getCountry(userId), repo.getCreditInfo(userId)]);
  const paid = row?.status === "active" && row.provider_subscription_id ? row.provider : null;
  if (paid) {
    const region = regionForProvider(paid);
    return { region, country, locked: `Your subscription is billed in ${currencyName(region.currency)}. Cancel it and let it end before you change your country.` };
  }
  if (credit.balance !== 0) {
    const region = billingRegion(credit.currency === "usd" ? "US" : "IN");
    return { region, country, locked: `You have AI credit in ${currencyName(credit.currency)}. Use it up before you change your country, or ask support to move it.` };
  }
  return { region: billingRegion(country), country, locked: null };
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

/** The plans on offer, as shown to someone paying in `currency` (rupee or dollar prices; a plan with no dollar price yet is left out in dollars). */
export const listPublicPlans = async (currency: Currency = "inr") => plansFor(await repo.listPlans({ activeOnly: true }), currency);

export async function getMyBilling(userId: string): Promise<MyBilling> {
  const [row, plans, key] = await Promise.all([settled(userId), repo.listPlans({ activeOnly: false }), repo.getAiKey(userId)]);
  const { region, country, locked } = await regionFor(userId, row);
  const live = row?.status === "active" ? row : null;
  const rawPlan = live ? (plans.find((p) => p.id === live.plan_id) ?? null) : null;
  const plan = rawPlan ? localizePlan(rawPlan, region.currency) : null;
  const subPlan = plans.find((p) => p.id === "subscription" && p.active);
  const connected = paymentsLive(region.provider);
  const trialAvailable = !!subPlan && subPlan.trial_days > 0 && connected && !(await repo.hasUsedTrial(userId));
  const since = live?.period_start ?? new Date(Date.UTC(now().getUTCFullYear(), now().getUTCMonth(), 1)).toISOString();
  const [tokens, credit, creditTotal, limits] = await Promise.all([repo.tokensSince(userId, since), repo.getCredit(userId), repo.getCreditTotal(userId), getTopupLimits(region.currency)]);
  return {
    plans: plansFor(plans.filter((p) => p.active), region.currency),
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
    payments_connected: connected,
    country,
    currency: region.currency,
    provider: region.provider,
    country_locked: locked,
    credit_cents: credit,
    credit_total_cents: creditTotal,
    topup: { min_cents: limits.minCents, max_cents: limits.maxCents, options_cents: [...limits.optionsCents] },
  };
}

/**
 * Saves the person's country. Changing to a country that pays in the same currency is always fine. Moving between rupees and dollars is
 * refused while a paid subscription is running or AI credit is held in the other currency, because that money belongs to one provider;
 * the message says what to do first. Setting it for the first time (setup) is always fine.
 */
export async function setCountry(userId: string, input: string): Promise<MyBilling> {
  const code = cleanCountry(input);
  if (!code) throw new ValidationError("Choose your country from the list.");
  const row = await settled(userId);
  const now_ = await regionFor(userId, row);
  if (billingRegion(code).currency !== now_.region.currency && now_.locked) throw new ConflictError(now_.locked);
  await repo.setCountry(userId, code);
  return getMyBilling(userId);
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
    provider: "razorpay",
    provider_subscription_id: null,
    provider_status: null,
    trial_ends_at: null,
  });
}

/** Stops a paid subscription right away, at whichever provider bills it (used when someone moves to a plan that doesn't charge a subscription). */
async function endProviderSubscription(row: UserBillingRow | null) {
  if (!row?.provider_subscription_id || row.status !== "active") return;
  try {
    if (row.provider === "stripe") await stripe.cancelNow(row.provider_subscription_id);
    else await razorpay.cancelSubscription(row.provider_subscription_id, false);
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
    const { region } = await regionFor(userId, row);
    // A paid subscription is only ever started through checkout, where the payment happens; it is never switched on by this call.
    if (plan && paymentsLive(region.provider) && isPaid(localizePlan(plan, region.currency))) throw new ValidationError("Subscribe through checkout to start this plan.");
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
      // Stripe keeps a trial running to its end and then does not charge; Razorpay can only cancel an un-started subscription at once.
      if (row.provider === "stripe") await stripe.setCancelAtPeriodEnd(row.provider_subscription_id, true);
      else await razorpay.cancelSubscription(row.provider_subscription_id, !trialing);
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
  // Stripe can take a scheduled cancellation back. Razorpay can't, so a Razorpay plan is started again from checkout once it has ended.
  if (row.provider_subscription_id && row.provider === "stripe") {
    try {
      await stripe.setCancelAtPeriodEnd(row.provider_subscription_id, false);
    } catch {
      throw new ConflictError(PROVIDER_DOWN);
    }
  } else if (row.provider_subscription_id)
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

/** Where Stripe's page sends the person back to. `/billing/return` finishes the trip on the web, or hands the phone back to the app. */
const stripeReturn = (client: "web" | "app", outcome: "success" | "cancel") =>
  `${appLink("/billing/return")}?status=${outcome}${client === "app" ? "&app=1" : ""}${outcome === "success" ? "&session_id={CHECKOUT_SESSION_ID}" : ""}`;

/**
 * Whether this request should use Stripe's native payment sheet: the phone app asks for it, a publishable key is set, and automatic tax
 * is off (the sheet doesn't collect the address Stripe Tax needs, so with tax on the app uses Stripe's page instead).
 */
const sheetKey = (client: "web" | "app") => {
  const st = serverEnv().stripe;
  return client === "app" && st.publishableKey && !st.automaticTax ? st.publishableKey : null;
};

/** The person's Stripe customer (made on first use) and a short-lived session that lets the sheet show their saved cards. */
async function stripeCustomerFor(userId: string) {
  let id = await repo.getStripeCustomer(userId);
  if (!id) {
    const who = await repo.getContact(userId);
    id = await repo.saveStripeCustomer(userId, (await stripe.createCustomer({ userId, email: who?.email ?? "", name: who?.name ?? "" })).id);
  }
  return { customer_id: id, customer_session_secret: (await stripe.createCustomerSession(id)).client_secret };
}

/** The Stripe product that carries a plan's dollar prices, created once. */
async function stripeProductFor(plan: BillingPlan): Promise<string> {
  const have = await repo.getStripeProduct(plan.id);
  if (have) return have;
  await repo.setStripeProduct(plan.id, (await stripe.createProduct(plan.name)).id);
  return (await repo.getStripeProduct(plan.id))!;
}

/**
 * Step 1 of paying for a subscription. India: creates the Razorpay subscription and returns what its checkout window needs. Elsewhere:
 * creates a Stripe Checkout page in dollars and returns its address. Which one comes from the person's country (or the provider already
 * billing them); the price is the plan's rupee or dollar price to match.
 */
export async function startCheckout(userId: string, planId: PlanId, client: "web" | "app" = "web"): Promise<CheckoutSession> {
  const row = await settled(userId);
  const { region, country } = await regionFor(userId, row);
  if (!country) throw new ValidationError("Choose your country first, in Settings, My account, so you are charged in the right currency.");
  if (!paymentsLive(region.provider)) throw new ConflictError("Payments aren’t switched on yet.");
  const raw = await repo.getPlan(planId);
  if (!raw || !raw.active) throw new ValidationError("That plan isn’t available.");
  const plan = localizePlan(raw, region.currency);
  if (!isPaid(plan)) throw new ValidationError(region.currency === "usd" && isPaid(raw) ? "That plan isn’t available in US dollars yet." : "That plan doesn’t need a payment.");
  if (row?.status === "active" && row.plan_id === plan.id && row.provider_subscription_id && !row.cancel_at_period_end)
    throw new ConflictError("You’re already on this plan.");
  // One free trial per person, ever: the first charge is pushed back by the plan's trial days.
  const trialDays = plan.trial_days > 0 && !(await repo.hasUsedTrial(userId)) ? plan.trial_days : 0;
  const who = await repo.getContact(userId);
  if (region.provider === "stripe") {
    const pk = sheetKey(client);
    if (pk) {
      try {
        const cust = await stripeCustomerFor(userId);
        const sub = await stripe.createSheetSubscription({
          customerId: cust.customer_id,
          userId,
          productId: await stripeProductFor(raw),
          amountCents: plan.price_cents,
          interval: plan.interval === "year" ? "year" : "month",
          trialDays,
        });
        const intent = typeof sub.pending_setup_intent === "object" && sub.pending_setup_intent ? sub.pending_setup_intent : null;
        const inv = typeof sub.latest_invoice === "object" && sub.latest_invoice ? sub.latest_invoice : null;
        const pay = inv && typeof inv.payment_intent === "object" && inv.payment_intent ? inv.payment_intent : null;
        const secret = trialDays > 0 ? intent?.client_secret : pay?.client_secret;
        if (!secret) throw new ConflictError(PROVIDER_DOWN);
        return { provider: "stripe", sheet: { publishable_key: pk, ...cust, intent: trialDays > 0 ? "setup" : "payment", client_secret: secret, reference_id: sub.id, kind: "subscription", name: plan.name, amount: plan.price_cents, trial_days: trialDays } };
      } catch (e) {
        if (e instanceof stripe.StripeError) throw new ConflictError(PROVIDER_DOWN);
        throw e;
      }
    }
    try {
      const session = await stripe.createSubscriptionCheckout({
        userId,
        email: who?.email ?? "",
        productName: plan.name,
        amountCents: plan.price_cents,
        interval: plan.interval === "year" ? "year" : "month",
        trialDays,
        successUrl: stripeReturn(client, "success"),
        cancelUrl: stripeReturn(client, "cancel"),
      });
      if (!session.url) throw new ConflictError(PROVIDER_DOWN);
      return { provider: "stripe", url: session.url };
    } catch (e) {
      if (e instanceof stripe.StripeError) throw new ConflictError(PROVIDER_DOWN);
      throw e;
    }
  }
  const keyId = razorpay.razorpayKeyId();
  if (!keyId) throw new ConflictError("Payments aren’t switched on yet.");
  try {
    const sub = await razorpay.createSubscription({
      planId: await razorpayPlanFor(raw),
      interval: plan.interval === "year" ? "year" : "month",
      userId,
      startAt: trialDays ? Math.floor(Date.now() / 1000) + trialDays * 86_400 : undefined,
    });
    return {
      provider: "razorpay",
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
      provider: "razorpay",
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
  await stopOldSubscription(old, sub.id);
  return getMyBilling(userId);
}

/** After a new paid subscription starts, stops the one it replaces (at its own provider) so the person isn't charged twice. */
async function stopOldSubscription(old: UserBillingRow | null, newId: string) {
  if (!old?.provider_subscription_id || old.provider_subscription_id === newId || old.status !== "active") return;
  if (old.provider === "stripe") await stripe.cancelNow(old.provider_subscription_id).catch(() => undefined);
  else await razorpay.cancelSubscription(old.provider_subscription_id, false).catch(() => undefined);
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

/**
 * Step 1 of a top-up: India gets a Razorpay order (rupees), everyone else a Stripe Checkout page (dollars). The amount is checked
 * against the limits in the person's own currency, in whole units.
 */
export async function startTopup(userId: string, amountCents: number, client: "web" | "app" = "web"): Promise<TopupSession> {
  const row = await settled(userId);
  const { region, country } = await regionFor(userId, row);
  if (!country) throw new ValidationError("Choose your country first, in Settings, My account, so you are charged in the right currency.");
  if (!paymentsLive(region.provider)) throw new ConflictError("Payments aren’t switched on yet.");
  const limits = await getTopupLimits(region.currency);
  if (!validTopup(amountCents, limits)) throw new ValidationError(`Choose a whole-${region.currency === "usd" ? "dollar" : "rupee"} amount from ${topupRange(limits, region.currency)}.`);
  if (row?.status !== "active" || row.plan_id !== "payg") throw new ConflictError("Choose the Pay as you go plan to add credit.");
  const who = await repo.getContact(userId);
  if (region.provider === "stripe") {
    const pk = sheetKey(client);
    if (pk) {
      try {
        const cust = await stripeCustomerFor(userId);
        const pi = await stripe.createTopupIntent({ customerId: cust.customer_id, userId, amountCents });
        if (!pi.client_secret) throw new ConflictError(PROVIDER_DOWN);
        return { provider: "stripe", sheet: { publishable_key: pk, ...cust, intent: "payment", client_secret: pi.client_secret, reference_id: pi.id, kind: "topup", name: "Naazhi AI credit", amount: amountCents, trial_days: 0 } };
      } catch (e) {
        if (e instanceof stripe.StripeError) throw new ConflictError(PROVIDER_DOWN);
        throw e;
      }
    }
    try {
      const session = await stripe.createTopupCheckout({
        userId,
        email: who?.email ?? "",
        productName: "Naazhi AI credit",
        amountCents,
        successUrl: stripeReturn(client, "success"),
        cancelUrl: stripeReturn(client, "cancel"),
      });
      if (!session.url) throw new ConflictError(PROVIDER_DOWN);
      return { provider: "stripe", url: session.url };
    } catch (e) {
      if (e instanceof stripe.StripeError) throw new ConflictError(PROVIDER_DOWN);
      throw e;
    }
  }
  const keyId = razorpay.razorpayKeyId();
  if (!keyId) throw new ConflictError("Payments aren’t switched on yet.");
  try {
    const order = await razorpay.createOrder({ amount: amountCents, receipt: `topup_${userId.slice(0, 8)}_${Date.now()}`, notes: { user_id: userId, kind: "topup" } });
    return { provider: "razorpay", key_id: keyId, order_id: order.id, amount: amountCents, currency: "INR", name: "Naazhi AI credit", description: "Pay as you go", prefill: { name: who?.name ?? "", email: who?.email ?? "", ...(who?.phone ? { contact: who.phone } : {}) } };
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
  const added = (await repo.applyCredit(userId, pay.amount, "topup", { ref: paymentId, currency: "inr" })) !== null;
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

/* ---------- Stripe (everyone outside India, US dollars) ---------- */

const UUID = /^[0-9a-f-]{36}$/i;

type StripeEvent = { id?: string; type?: string; data?: { object?: unknown } };

/** A Stripe subscription's state as the person's plan row. Only ever sets absolute state, so a repeat or a late event changes nothing. */
async function applyStripeSubscription(userId: string, sub: stripe.StripeSubscription, opts: { adopt: boolean }) {
  const row = await repo.getUserBilling(userId);
  const mine = row?.provider_subscription_id === sub.id;
  const free = !row || row.status !== "active" || !row.provider_subscription_id;
  if (sub.status === "trialing" || sub.status === "active" || sub.status === "past_due") {
    // A subscription we don't know yet only takes over the plan row when asked to (the person's own checkout), never from a stray event.
    if (!mine && !free && !opts.adopt) return;
    const plan = await repo.getPlan("subscription");
    if (!plan) return;
    const { start: ps, end: pe } = stripe.periodOf(sub);
    const trial = sub.status === "trialing" && sub.trial_end && sub.trial_end * 1000 > Date.now() ? iso(sub.trial_end) : null;
    const start = trial ? now().toISOString() : (iso(ps) ?? now().toISOString());
    const end = trial ?? iso(pe) ?? periodEnd(plan, new Date(start))?.toISOString() ?? null;
    // Never move a period backwards (webhooks can arrive out of order).
    const keepEnd = mine && row?.period_end && end && new Date(row.period_end) > new Date(end) ? row.period_end : end;
    const keepStart = mine && row?.period_end && keepEnd === row.period_end ? row.period_start : start;
    await repo.saveUserBilling(userId, {
      plan_id: "subscription",
      status: "active",
      period_start: keepStart,
      period_end: keepEnd,
      cancel_at_period_end: sub.cancel_at_period_end,
      canceled_at: null,
      provider: "stripe",
      provider_subscription_id: sub.id,
      provider_status: sub.status,
      trial_ends_at: trial,
    });
    return;
  }
  if (!mine || !row) return;
  if (sub.status === "canceled" || sub.status === "unpaid" || sub.status === "incomplete_expired") {
    await repo.saveUserBilling(userId, { ...row, status: "canceled", cancel_at_period_end: false, canceled_at: row.canceled_at ?? now().toISOString(), provider_status: sub.status });
    return;
  }
  await repo.saveUserBilling(userId, { ...row, provider_status: sub.status });
}

/** The invoice (and emailed receipt) for one Stripe subscription charge, once per Stripe invoice whichever of the return trip or the webhook gets there first. */
async function issueStripeInvoice(userId: string, inv: stripe.StripeInvoice) {
  if (inv.currency !== "usd" || !Number.isInteger(inv.amount_paid) || inv.amount_paid <= 0) return;
  const plan = await repo.getPlan("subscription");
  const line = inv.lines?.data?.[0]?.period;
  await issueInvoice({
    userId,
    kind: "subscription",
    description: `${plan?.name ?? "Subscription"}, ${plan?.interval === "year" ? "yearly" : "monthly"}`,
    amountCents: inv.amount_paid,
    paymentId: inv.id,
    ref: inv.payment_intent ?? null,
    periodStart: iso(line?.start ?? inv.period_start),
    periodEnd: iso(line?.end ?? inv.period_end),
    currency: "usd",
    provider: "stripe",
  });
}

/** Adds a paid Stripe top-up to the balance, once (the payment intent id is the ledger's unique reference). */
async function creditStripeIntent(userId: string, p: { amount: number; currency: string | null | undefined; intent: string; ref: string }): Promise<boolean> {
  if (p.currency !== "usd" || !Number.isInteger(p.amount) || p.amount < 100) return false;
  const added = (await repo.applyCredit(userId, p.amount, "topup", { ref: p.intent, currency: "usd" })) !== null;
  if (added) await issueInvoice({ userId, kind: "topup", description: "AI credit top-up", amountCents: p.amount, paymentId: p.intent, ref: p.ref, currency: "usd", provider: "stripe" }).catch(() => undefined);
  return added;
}

const creditStripeTopup = (userId: string, s: stripe.StripeSession) =>
  s.payment_status === "paid" && s.payment_intent ? creditStripeIntent(userId, { amount: s.amount_total ?? 0, currency: s.currency, intent: s.payment_intent, ref: s.id }) : Promise.resolve(false);

/** Applies a finished Stripe Checkout page for this person: a subscription becomes their plan, a paid top-up becomes credit. */
async function applyStripeSession(userId: string, s: stripe.StripeSession) {
  if (s.status !== "complete") return;
  if (s.mode === "subscription" && s.subscription) {
    const old = await repo.getUserBilling(userId);
    const sub = await stripe.fetchSubscription(s.subscription);
    await applyStripeSubscription(userId, sub, { adopt: true });
    // The trial is spent the moment it starts (not when checkout opens), so closing the page doesn't burn it.
    if (sub.status === "trialing") await repo.markTrialUsed(userId, "subscription", sub.id).catch(() => undefined);
    // The first charge: invoice it now rather than wait for the webhook. A trial has nothing to invoice yet.
    if (s.invoice && s.payment_status === "paid" && (s.amount_total ?? 0) > 0) await stripe.fetchInvoice(s.invoice).then((inv) => issueStripeInvoice(userId, inv)).catch(() => undefined);
    await stopOldSubscription(old, sub.id);
  } else if (s.mode === "payment" && s.metadata?.kind === "topup") {
    await creditStripeTopup(userId, s);
  }
}

/**
 * Back from Stripe: the Checkout page (a session id), or the phone's native sheet (a subscription id or a payment intent id). The id is
 * untrusted; we ask Stripe for the object ourselves and check it was made for this person, so a forged or someone else's id grants nothing.
 */
export async function confirmStripe(userId: string, input: { sessionId?: string; subscriptionId?: string; paymentIntentId?: string }): Promise<MyBilling> {
  const deny = () => new ForbiddenError("We couldn’t verify that payment.");
  try {
    if (input.subscriptionId) {
      if (!/^sub_[A-Za-z0-9_]+$/.test(input.subscriptionId)) throw deny();
      const sub = await stripe.fetchSubscriptionExpanded(input.subscriptionId);
      if (sub.metadata?.user_id !== userId) throw deny();
      // The sheet only reports success once the card is saved or paid; Stripe says whether the subscription really started.
      if (sub.status !== "active" && sub.status !== "trialing") throw new ConflictError("That payment hasn’t completed. You haven’t been charged.");
      const old = await repo.getUserBilling(userId);
      await applyStripeSubscription(userId, sub, { adopt: true });
      if (sub.status === "trialing") await repo.markTrialUsed(userId, "subscription", sub.id).catch(() => undefined);
      const inv = typeof sub.latest_invoice === "object" ? sub.latest_invoice : null;
      if (inv) await issueStripeInvoice(userId, { ...inv, payment_intent: typeof inv.payment_intent === "object" ? inv.payment_intent?.id : inv.payment_intent }).catch(() => undefined);
      await stopOldSubscription(old, sub.id);
    } else if (input.paymentIntentId) {
      if (!/^pi_[A-Za-z0-9_]+$/.test(input.paymentIntentId)) throw deny();
      const pi = await stripe.fetchPaymentIntent(input.paymentIntentId);
      if (pi.metadata?.user_id !== userId || pi.metadata?.kind !== "topup") throw deny();
      if (pi.status === "succeeded") await creditStripeIntent(userId, { amount: pi.amount ?? 0, currency: pi.currency, intent: pi.id, ref: pi.id });
    } else if (input.sessionId) {
      if (!/^cs_[A-Za-z0-9_]+$/.test(input.sessionId)) throw deny();
      const session = await stripe.fetchSession(input.sessionId);
      if (session.client_reference_id !== userId || session.metadata?.user_id !== userId) throw deny();
      await applyStripeSession(userId, session);
    } else throw deny();
  } catch (e) {
    if (e instanceof stripe.StripeError) throw new ConflictError(PROVIDER_DOWN);
    throw e;
  }
  return getMyBilling(userId);
}

/**
 * Stripe's webhook (the route has verified the signature and its timestamp). Safe to receive twice or out of order: the event id is
 * claimed once, the handlers only set absolute state (subscriptions are re-read from Stripe rather than trusted from the event), and a
 * failure gives the claim back so Stripe's retry runs again.
 */
export async function handleStripeEvent(event: StripeEvent) {
  const id = event.id;
  const type = event.type ?? "";
  if (!id || !(await repo.claimEvent(id, type))) return;
  try {
    const obj = event.data?.object as Record<string, unknown> | undefined;
    if (!obj) return;
    if (type === "checkout.session.completed" || type === "checkout.session.async_payment_succeeded") {
      const s = obj as unknown as stripe.StripeSession;
      const userId = s.client_reference_id;
      if (userId && UUID.test(userId)) await applyStripeSession(userId, { ...s, status: s.status ?? "complete" });
      return;
    }
    if (type === "payment_intent.succeeded") {
      // A top-up paid in the phone's native sheet (or on a Checkout page): credited even if the app was closed before it could confirm.
      const pi = obj as unknown as stripe.StripeIntent;
      const uid = pi.metadata?.user_id;
      if (pi.metadata?.kind === "topup" && uid && UUID.test(uid)) await creditStripeIntent(uid, { amount: pi.amount ?? 0, currency: pi.currency, intent: pi.id, ref: pi.id });
      return;
    }
    if (type === "refund.created" || type === "refund.updated" || type === "charge.refund.updated") {
      const r = obj as unknown as stripe.StripeRefund;
      if (r.status === "succeeded" && r.id && r.payment_intent && Number.isInteger(r.amount)) await recordRefund(r.id, r.payment_intent, r.amount);
      return;
    }
    const subId = type.startsWith("customer.subscription.") ? (obj.id as string | undefined) : (obj.subscription as string | null | undefined);
    if (!subId) return;
    const sub = await stripe.fetchSubscription(subId);
    const noted = sub.metadata?.user_id;
    const userId = (await repo.userIdForSubscription(subId)) ?? (noted && UUID.test(noted) ? noted : null);
    if (!userId) return;
    if (type === "invoice.payment_failed") {
      await repo.setProviderStatus(userId, subId, "payment_failed");
      await notifyBilling(userId, (url) => templates.paymentFailed({ url }));
      return;
    }
    await applyStripeSubscription(userId, sub, { adopt: false });
    if (type === "invoice.paid") await issueStripeInvoice(userId, obj as unknown as stripe.StripeInvoice).catch(() => undefined);
    if (type === "customer.subscription.deleted") {
      const plan = await repo.getPlan("subscription");
      await notifyBilling(userId, (url) => templates.subscriptionEnded({ planName: plan?.name ?? "Subscription", url }));
    }
  } catch (e) {
    await repo.releaseEvent(id).catch(() => undefined);
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
  // Pay as you go is always prepaid: tokens come off the person's credit and AI pauses when it is gone, whether or not
  // Razorpay is connected yet (until then an admin adds credit with Adjust).
  const prepaid = planId === "payg";
  const payg = prepaid ? await repo.getPlan("payg") : null;
  // The balance is held in one currency, and replies are priced in that same currency.
  const credit = prepaid ? await repo.getCreditInfo(userId) : null;
  const count = async (usage: { inputTokens: number; outputTokens: number }, provider: string) => {
    await repo.addUsage(userId, planId, provider, usage.inputTokens, usage.outputTokens).catch(() => undefined);
    const tokens = usage.inputTokens + usage.outputTokens;
    if (!payg || !credit) return;
    let after: number | null = null;
    let cost = 0;
    if (credit.currency === "usd") {
      // Dollars: a reply costs a fraction of a cent, so the part-cent is carried instead of rounding every reply up.
      const charged = await repo.chargeUsageCarry(userId, tokens, payg.token_price_cents_per_million_usd).catch(() => null);
      after = charged?.balance ?? null;
      cost = charged?.cost ?? 0;
    } else {
      cost = tokenCostCents(tokens, payg.token_price_cents_per_million);
      if (cost > 0) after = await repo.applyCredit(userId, -cost, "usage", { tokens }).catch(() => null);
    }
    // Tell the person once, when this reply is the one that used the last of their credit.
    if (cost > 0 && after !== null && after + cost > 0 && after <= 0) void notifyBilling(userId, (url) => templates.creditEmpty({ url }));
  };
  if (prepaid && credit && credit.balance <= 0)
    throw new ForbiddenError(
      paymentsLive((await regionFor(userId, row)).region.provider)
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
  const [plans, totals, subscribers, tokens30d, limits, limitsUsd, seller] = await Promise.all([
    repo.listPlans({ activeOnly: false }),
    repo.planTotals(),
    repo.listSubscribers(),
    repo.usageTotal30d(),
    getTopupLimits("inr"),
    getTopupLimits("usd"),
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
  const st = serverEnv().stripe;
  const stripeStatus = { live: paymentsLive("stripe"), keys: Boolean(st.secretKey), webhook: Boolean(st.webhookSecret), mode: stripe.stripeMode(), tax: st.automaticTax };
  return { plans, totals, subscribers, tokens30d, limits, limitsUsd, razorpayStatus, stripeStatus, seller };
}

export async function adminSaveSettings(input: import("zod").infer<typeof import("./billing.schema").billingSettingsInput>) {
  const options = [...new Set(input.topup_options_cents)].sort((a, b) => a - b);
  const usd = [...new Set(input.topup_options_cents_usd)].sort((a, b) => a - b);
  await repo.saveSettings({
    topup_min_cents: input.topup_min_cents,
    topup_max_cents: input.topup_max_cents,
    topup_options_cents: options,
    topup_min_cents_usd: input.topup_min_cents_usd,
    topup_max_cents_usd: input.topup_max_cents_usd,
    topup_options_cents_usd: usd,
  });
}

/** Adds or removes credit for a person (support, goodwill, a correction). Written to the ledger as an adjustment; returns the new balance. */
export async function adminAdjustCredit(userId: string, amountCents: number): Promise<number> {
  // In the currency the balance is already held in; a zero balance takes the person's own (country's) currency.
  const credit = await repo.getCreditInfo(userId);
  const currency = credit.balance !== 0 ? credit.currency : billingRegion(await repo.getCountry(userId)).currency;
  const balance = await repo.applyCredit(userId, amountCents, "adjust", { currency });
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
