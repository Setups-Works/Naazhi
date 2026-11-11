import "server-only";
import type { BillingPlan, PlanId } from "@untitled/types";
import { withOwner, withUser } from "../db/pool";

/**
 * Data access for plans, a person's plan, metered AI use and their own-key row. Reads of a person's own data run as that person
 * (row-level security scopes them). Writes run as the owner on purpose: people can't write these tables themselves, so every change
 * goes through the billing service, which has already checked it. The key table is owner-only both ways.
 */

const PLAN_COLS = `id, name, tagline, price_cents, currency, interval, included_tokens::float8 as included_tokens,
  token_price_cents_per_million, features, active, sort`;

export type UserBillingRow = {
  user_id: string;
  plan_id: PlanId;
  status: "active" | "canceled";
  period_start: string;
  period_end: string | null;
  cancel_at_period_end: boolean;
  started_at: string;
  canceled_at: string | null;
  /** The Razorpay subscription paying for this plan, when there is one. */
  provider_subscription_id: string | null;
  provider_status: string | null;
};

export const listPlans = (opts: { activeOnly: boolean }) =>
  withOwner(
    async (c) =>
      (await c.query<BillingPlan>(`select ${PLAN_COLS} from public.billing_plans ${opts.activeOnly ? "where active" : ""} order by sort, id`)).rows,
  );

export const getPlan = (id: string) =>
  withOwner(async (c) => (await c.query<BillingPlan>(`select ${PLAN_COLS} from public.billing_plans where id = $1`, [id])).rows[0] ?? null);

export type PlanPatch = Partial<Pick<BillingPlan, "name" | "tagline" | "price_cents" | "currency" | "interval" | "included_tokens" | "token_price_cents_per_million" | "features" | "active" | "sort">>;

const PATCHABLE = new Set(["name", "tagline", "price_cents", "currency", "interval", "included_tokens", "token_price_cents_per_million", "features", "active", "sort"]);

export const updatePlan = (id: string, patch: PlanPatch) =>
  withOwner(async (c) => {
    // Column names come from this list, never from the caller.
    const entries = Object.entries(patch).filter(([k, v]) => v !== undefined && PATCHABLE.has(k));
    if (!entries.length) return getPlan(id);
    const sets = entries.map(([k], i) => `${k} = $${i + 2}`);
    const res = await c.query<BillingPlan>(
      `update public.billing_plans set ${sets.join(", ")}, updated_at = now() where id = $1 returning ${PLAN_COLS}`,
      [id, ...entries.map(([, v]) => v)],
    );
    return res.rows[0] ?? null;
  });

export const getUserBilling = (userId: string) =>
  withUser(userId, async (c) => (await c.query<UserBillingRow>("select * from public.user_billing where user_id = $1", [userId])).rows[0] ?? null);

type BillingWrite = Pick<
  UserBillingRow,
  "plan_id" | "status" | "period_start" | "period_end" | "cancel_at_period_end" | "canceled_at" | "provider_subscription_id" | "provider_status"
>;

export const saveUserBilling = (userId: string, b: BillingWrite) =>
  withOwner(async (c) => {
    await c.query(
      `insert into public.user_billing (user_id, plan_id, status, period_start, period_end, cancel_at_period_end, canceled_at,
         provider_subscription_id, provider_status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (user_id) do update set plan_id = excluded.plan_id, status = excluded.status, period_start = excluded.period_start,
         period_end = excluded.period_end, cancel_at_period_end = excluded.cancel_at_period_end, canceled_at = excluded.canceled_at,
         provider_subscription_id = excluded.provider_subscription_id, provider_status = excluded.provider_status,
         started_at = case when public.user_billing.plan_id = excluded.plan_id and public.user_billing.status = 'active'
                           then public.user_billing.started_at else now() end,
         updated_at = now()`,
      [userId, b.plan_id, b.status, b.period_start, b.period_end, b.cancel_at_period_end, b.canceled_at, b.provider_subscription_id, b.provider_status],
    );
  });

export const clearUserBilling = (userId: string) =>
  withOwner(async (c) => void (await c.query("delete from public.user_billing where user_id = $1", [userId])));

export const addUsage = (userId: string, planId: PlanId | null, provider: string, inputTokens: number, outputTokens: number) =>
  withOwner(
    async (c) =>
      void (await c.query("insert into public.ai_usage (user_id, plan_id, provider, input_tokens, output_tokens) values ($1, $2, $3, $4, $5)", [
        userId,
        planId,
        provider.slice(0, 40),
        Math.max(0, Math.floor(inputTokens)),
        Math.max(0, Math.floor(outputTokens)),
      ])),
  );

/** Tokens a person has used since `since`. */
export const tokensSince = (userId: string, since: string) =>
  withUser(
    userId,
    async (c) =>
      Number(
        (await c.query<{ n: string | null }>("select coalesce(sum(input_tokens + output_tokens), 0)::text as n from public.ai_usage where user_id = $1 and created_at >= $2", [userId, since])).rows[0]!.n,
      ),
  );

export type KeyRow = { provider: string; model: string; key_cipher: string; key_hint: string };

export const getAiKey = (userId: string) =>
  withOwner(async (c) => (await c.query<KeyRow>("select provider, model, key_cipher, key_hint from public.user_ai_keys where user_id = $1", [userId])).rows[0] ?? null);

export const saveAiKey = (userId: string, k: KeyRow) =>
  withOwner(
    async (c) =>
      void (await c.query(
        `insert into public.user_ai_keys (user_id, provider, model, key_cipher, key_hint) values ($1, $2, $3, $4, $5)
         on conflict (user_id) do update set provider = excluded.provider, model = excluded.model, key_cipher = excluded.key_cipher,
           key_hint = excluded.key_hint, updated_at = now()`,
        [userId, k.provider, k.model, k.key_cipher, k.key_hint],
      )),
  );

export const deleteAiKey = (userId: string) => withOwner(async (c) => void (await c.query("delete from public.user_ai_keys where user_id = $1", [userId])));

/** Admin views. Counts and token totals only, never anything a person wrote. */
export type SubscriberRow = {
  user_id: string;
  email: string;
  name: string;
  plan_id: PlanId;
  status: "active" | "canceled";
  period_end: string | null;
  cancel_at_period_end: boolean;
  tokens_30d: number;
  /** Prepaid AI credit left, in paise. */
  credit_cents: number;
};

export const listSubscribers = () =>
  withOwner(
    async (c) =>
      (await c.query<SubscriberRow>(
        `select b.user_id, u.email, u.name, b.plan_id, b.status, b.period_end, b.cancel_at_period_end,
                coalesce((select sum(a.input_tokens + a.output_tokens) from public.ai_usage a
                          where a.user_id = b.user_id and a.created_at >= now() - interval '30 days'), 0)::float8 as tokens_30d,
                coalesce((select c.balance_cents from public.user_ai_credit c where c.user_id = b.user_id), 0)::float8 as credit_cents
         from public.user_billing b join auth.users u on u.id = b.user_id
         order by b.updated_at desc limit 500`,
      )).rows,
  );

export type PlanTotals = { plan_id: string; people: number; active: number };

export const planTotals = () =>
  withOwner(
    async (c) =>
      (await c.query<PlanTotals>(
        `select plan_id, count(*)::int as people, count(*) filter (where status = 'active')::int as active from public.user_billing group by plan_id`,
      )).rows,
  );

export const usageTotal30d = () =>
  withOwner(
    async (c) =>
      Number(
        (await c.query<{ n: string }>("select coalesce(sum(input_tokens + output_tokens), 0)::text as n from public.ai_usage where created_at >= now() - interval '30 days'")).rows[0]!.n,
      ),
  );

/* ---------- Razorpay ---------- */

/** Who is paid for by this Razorpay subscription (the webhook's way back to a person). */
export const userIdForSubscription = (subscriptionId: string) =>
  withOwner(
    async (c) =>
      (await c.query<{ user_id: string }>("select user_id from public.user_billing where provider_subscription_id = $1", [subscriptionId])).rows[0]?.user_id ??
      null,
  );

export const getPlanProvider = (id: string) =>
  withOwner(
    async (c) =>
      (await c.query<{ razorpay_plan_id: string | null; razorpay_plan_key: string | null }>(
        "select razorpay_plan_id, razorpay_plan_key from public.billing_plans where id = $1",
        [id],
      )).rows[0] ?? null,
  );

export const setPlanProvider = (id: string, razorpayPlanId: string, key: string) =>
  withOwner(
    async (c) =>
      void (await c.query("update public.billing_plans set razorpay_plan_id = $2, razorpay_plan_key = $3 where id = $1", [id, razorpayPlanId, key])),
  );

export const getContact = (userId: string) =>
  withOwner(async (c) => (await c.query<{ email: string; name: string }>("select email, name from auth.users where id = $1", [userId])).rows[0] ?? null);

/** Claims a webhook event: true if this call is the first to see it. Concurrent retries of one event can't both win. */
export const claimEvent = (id: string, type: string) =>
  withOwner(
    async (c) =>
      (await c.query("insert into public.billing_events (id, type) values ($1, $2) on conflict (id) do nothing", [id, type.slice(0, 80)])).rowCount === 1,
  );

/** Gives a claim back when handling failed, so Razorpay's retry is processed instead of skipped. */
export const releaseEvent = (id: string) => withOwner(async (c) => void (await c.query("delete from public.billing_events where id = $1", [id])));

export const setProviderStatus = (userId: string, subscriptionId: string, status: string) =>
  withOwner(
    async (c) =>
      void (await c.query("update public.user_billing set provider_status = $3, updated_at = now() where user_id = $1 and provider_subscription_id = $2", [
        userId,
        subscriptionId,
        status.slice(0, 40),
      ])),
  );

/* ---------- AI credit (Pay as you go) ---------- */

export const getCredit = (userId: string) =>
  withUser(
    userId,
    async (c) => Number((await c.query<{ b: string }>("select coalesce((select balance_cents from public.user_ai_credit where user_id = $1), 0)::text as b", [userId])).rows[0]!.b),
  );

/** The total of every top-up, in paise (the "of ₹X" beside the balance). */
export const getCreditTotal = (userId: string) =>
  withUser(
    userId,
    async (c) =>
      Number((await c.query<{ t: string }>("select coalesce(sum(amount_cents), 0)::text as t from public.ai_credit_ledger where user_id = $1 and kind = 'topup'", [userId])).rows[0]!.t),
  );

/**
 * Moves a person's balance by `delta` paise and writes the ledger line, in one transaction. With a `ref` (a Razorpay payment id) the same
 * movement is applied once: a second call returns false and changes nothing. Returns the new balance, or null when it was a repeat.
 */
export const applyCredit = (userId: string, delta: number, kind: "topup" | "usage" | "adjust", opts: { tokens?: number; ref?: string } = {}) =>
  withOwner(async (c) => {
    const line = await c.query(
      "insert into public.ai_credit_ledger (user_id, kind, amount_cents, tokens, ref) values ($1, $2, $3, $4, $5) on conflict (ref) do nothing",
      [userId, kind, delta, opts.tokens ?? null, opts.ref ?? null],
    );
    if (line.rowCount === 0) return null;
    const r = await c.query<{ b: string }>(
      `insert into public.user_ai_credit (user_id, balance_cents) values ($1, $2)
       on conflict (user_id) do update set balance_cents = public.user_ai_credit.balance_cents + excluded.balance_cents, updated_at = now()
       returning balance_cents::text as b`,
      [userId, delta],
    );
    return Number(r.rows[0]!.b);
  });

export type LedgerRow = { id: string; kind: "topup" | "usage" | "adjust"; amount_cents: number; tokens: number | null; created_at: string };

export const recentLedger = (userId: string, limit = 8) =>
  withUser(
    userId,
    async (c) =>
      (await c.query<LedgerRow>(
        "select id, kind, amount_cents::float8 as amount_cents, tokens, created_at from public.ai_credit_ledger where user_id = $1 order by created_at desc limit $2",
        [userId, limit],
      )).rows,
  );

/* ---------- billing settings (top-up limits) ---------- */

export type BillingSettings = { topup_min_cents: number; topup_max_cents: number; topup_options_cents: number[] };

export const getSettings = () =>
  withOwner(
    async (c) =>
      (await c.query<BillingSettings>("select topup_min_cents, topup_max_cents, topup_options_cents from public.billing_settings where id")).rows[0] ?? null,
  );

export const saveSettings = (s: BillingSettings) =>
  withOwner(
    async (c) =>
      void (await c.query(
        `insert into public.billing_settings (id, topup_min_cents, topup_max_cents, topup_options_cents) values (true, $1, $2, $3)
         on conflict (id) do update set topup_min_cents = excluded.topup_min_cents, topup_max_cents = excluded.topup_max_cents,
           topup_options_cents = excluded.topup_options_cents, updated_at = now()`,
        [s.topup_min_cents, s.topup_max_cents, s.topup_options_cents],
      )),
  );
