import type { BillingPlan, MyBilling } from "@untitled/types";

/** AI providers a person can bring their own key for. Fixed on purpose: the server only ever calls these addresses. */
export const BYO_PROVIDERS = [
  { id: "openai", keyUrl: "https://platform.openai.com/api-keys", label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  { id: "groq", keyUrl: "https://console.groq.com/keys", label: "Groq", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  { id: "openrouter", keyUrl: "https://openrouter.ai/keys", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini" },
  { id: "together", keyUrl: "https://api.together.ai/settings/api-keys", label: "Together AI", baseUrl: "https://api.together.xyz/v1", model: "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
  { id: "mistral", keyUrl: "https://console.mistral.ai/api-keys", label: "Mistral", baseUrl: "https://api.mistral.ai/v1", model: "mistral-small-latest" },
  { id: "deepseek", keyUrl: "https://platform.deepseek.com/api_keys", label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
] as const;

export type ByoProviderId = (typeof BYO_PROVIDERS)[number]["id"];
export const byoProvider = (id: string) => BYO_PROVIDERS.find((p) => p.id === id) ?? null;

/** The number format each currency is written in; anything else uses US formatting. */
const LOCALE: Record<string, string> = { inr: "en-IN" };

/** "₹749", "₹749.50", "Free": money in the smallest unit of the currency (paise for rupees). The product prices in rupees by default. */
export function formatMoney(cents: number, currency = "inr"): string {
  if (cents <= 0) return "Free";
  const amount = cents / 100;
  return new Intl.NumberFormat(LOCALE[currency.toLowerCase()] ?? "en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

/** An amount that may be zero: "₹0", "₹12.40" (formatMoney says "Free" for zero, which is wrong for a balance). */
export const formatBalance = (cents: number, currency = "inr") => (cents <= 0 ? formatMoney(100, currency).replace(/[\d.,]+/, "0") : formatMoney(cents, currency));

/** "1M", "250K", "1,200": tokens in a short form. */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  return n.toLocaleString("en-US");
}

/** The price line for a plan: "$9 / month", "$2 per 1M tokens", "Free". */
export function priceLine(plan: Pick<BillingPlan, "id" | "price_cents" | "currency" | "interval" | "token_price_cents_per_million">): string {
  if (plan.id === "payg") {
    return plan.token_price_cents_per_million > 0
      ? `${formatMoney(plan.token_price_cents_per_million, plan.currency)} per 1M tokens`
      : "Free";
  }
  if (plan.price_cents <= 0) return "Free";
  const per = plan.interval === "year" ? "year" : plan.interval === "month" ? "month" : "";
  return per ? `${formatMoney(plan.price_cents, plan.currency)} / ${per}` : formatMoney(plan.price_cents, plan.currency);
}

/**
 * A phone number as Razorpay and our database want it: international form, "+" and 8 to 15 digits. A bare 10-digit Indian mobile number
 * (starting 6 to 9, with or without a leading 0 or 91) becomes +91…; anything that doesn't look like a number gives null.
 */
export function normalizePhone(input: string): string | null {
  const raw = input.trim();
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  if (/^0[6-9]\d{9}$/.test(digits)) return `+91${digits.slice(1)}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

/** "7 days free, then ₹749 / month" for a plan with a trial, or just the price line. `eligible` is false once the person has had their trial. */
export function trialLine(plan: Pick<BillingPlan, "id" | "price_cents" | "currency" | "interval" | "token_price_cents_per_million" | "trial_days">, eligible = true): string {
  const price = priceLine(plan);
  if (!eligible || plan.id !== "subscription" || plan.trial_days <= 0 || plan.price_cents <= 0) return price;
  return `${plan.trial_days} ${plan.trial_days === 1 ? "day" : "days"} free, then ${price}`;
}

/** The button on a plan card: "Start 7-day free trial" when a trial applies, otherwise the usual wording. */
export const trialButtonLabel = (plan: Pick<BillingPlan, "trial_days">, eligible: boolean) =>
  eligible && plan.trial_days > 0 ? `Start ${plan.trial_days}-day free trial` : null;

/** Cost of `tokens` at a per-million rate, in the smallest currency unit, rounded up so a tiny amount is never silently free. */
export const tokenCostCents = (tokens: number, centsPerMillion: number) => Math.ceil((tokens * centsPerMillion) / 1_000_000);

/** A rough token count for text when a provider doesn't report usage: about four characters to a token. */
export const estimateTokens = (chars: number) => Math.max(0, Math.ceil(chars / 4));

/** `from` plus `n` months, keeping the day of the month where the target month has it (31 Jan + 1 month = 28 Feb). */
export function addMonths(from: Date, n: number): Date {
  const d = new Date(from.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}
export const addMonth = (from: Date) => addMonths(from, 1);

/** True when picking this plan means paying through Razorpay checkout (autopay) rather than just switching. Same rule on web and in the app. */
export const needsCheckout = (b: Pick<MyBilling, "payments_connected" | "plan" | "cancel_at_period_end">, p: Pick<BillingPlan, "id" | "price_cents" | "interval">) =>
  b.payments_connected && p.id === "subscription" && p.price_cents > 0 && p.interval !== "none" && !(b.plan?.id === p.id && !b.cancel_at_period_end);

/**
 * Prepaid AI credit for Pay as you go: the smallest and largest top-up and the quick amounts, in paise (₹50 minimum, so a payment is
 * never smaller than the fee it costs to take; ₹10,000 maximum). The same numbers drive the dialog on web and in the app and the checks
 * on the server.
 */
export const TOPUP = { minCents: 5_000, maxCents: 1_000_000, optionsCents: [10_000, 25_000, 50_000, 100_000] } as const;

export type TopupLimits = { minCents: number; maxCents: number; optionsCents: readonly number[] };

/** True for a whole-rupee amount inside the top-up limits (the defaults above, or the ones an admin set in Admin → Plans). */
export const validTopup = (cents: number, limits: Pick<TopupLimits, "minCents" | "maxCents"> = TOPUP) =>
  Number.isInteger(cents) && cents % 100 === 0 && cents >= limits.minCents && cents <= limits.maxCents;

/** One plan's answer in the pricing calculator. `monthlyCents` is what Naazhi charges for that much AI use in a month. */
export type PlanEstimate = {
  id: BillingPlan["id"];
  /** What Naazhi charges per month, in paise. */
  monthlyCents: number;
  /** False when the plan can't cover this much use (a subscription's allowance would run out). */
  covers: boolean;
  /** Subscription only: share of the monthly allowance this use would take (can pass 100). */
  allowanceUsedPct: number | null;
  /** Subscription only: what the tokens beyond the allowance would cost at the Pay as you go rate. */
  overflowCents: number;
};

/**
 * The pricing calculator's maths, from the plan rows themselves (nothing hard-coded): for `tokensPerMonth` of AI use, what each plan
 * costs. Pay as you go is the token rate; a subscription is its price while use stays inside its allowance (past it AI pauses, so
 * `covers` is false and the overflow is priced at the Pay as you go rate); Bring your own key costs Naazhi nothing (the provider bills).
 * `best` is the cheapest plan that covers the use, ties going to the plan with no fee.
 */
export function estimatePlans(tokensPerMonth: number, plans: BillingPlan[]): { estimates: PlanEstimate[]; best: BillingPlan["id"] | null } {
  const tokens = Math.max(0, Math.floor(tokensPerMonth));
  const payg = plans.find((p) => p.id === "payg");
  const estimates = plans.map((p): PlanEstimate => {
    if (p.id === "payg") return { id: p.id, monthlyCents: tokenCostCents(tokens, p.token_price_cents_per_million), covers: true, allowanceUsedPct: null, overflowCents: 0 };
    if (p.id === "byo") return { id: p.id, monthlyCents: 0, covers: true, allowanceUsedPct: null, overflowCents: 0 };
    const unlimited = p.included_tokens <= 0;
    const covers = unlimited || tokens <= p.included_tokens;
    return {
      id: p.id,
      monthlyCents: p.price_cents,
      covers,
      allowanceUsedPct: unlimited ? null : Math.round((tokens / p.included_tokens) * 100),
      overflowCents: covers || !payg ? 0 : tokenCostCents(tokens - p.included_tokens, payg.token_price_cents_per_million),
    };
  });
  // Bring your own key is not a "winner": it isn't Naazhi's price, so the recommendation is among the plans Naazhi charges for.
  const billable = estimates.filter((e) => e.id !== "byo" && e.covers);
  const best = billable.length ? billable.reduce((a, b) => (b.monthlyCents < a.monthlyCents ? b : a)).id : null;
  return { estimates, best };
}
