import { z } from "zod";
import { BYO_PROVIDERS } from "@untitled/logic/billing";

export const planIdInput = z.object({ planId: z.enum(["subscription", "payg", "byo"]) });

/** Starting to pay. `client` says where to send the person back to after Stripe's page: the website, or the phone app. */
export const checkoutInput = planIdInput.extend({ client: z.enum(["web", "app"]).default("web") });

/** Back from Stripe: a Checkout session id (the page) or a subscription / payment intent id (the phone's sheet); the server checks it with Stripe itself. */
export const stripeConfirmInput = z
  .object({
    sessionId: z.string().trim().regex(/^cs_[A-Za-z0-9_]+$/, "That isn’t a Stripe session.").max(200).optional(),
    subscriptionId: z.string().trim().regex(/^sub_[A-Za-z0-9_]+$/, "That isn’t a Stripe subscription.").max(200).optional(),
    paymentIntentId: z.string().trim().regex(/^pi_[A-Za-z0-9_]+$/, "That isn’t a Stripe payment.").max(200).optional(),
  })
  .refine((v) => [v.sessionId, v.subscriptionId, v.paymentIntentId].filter(Boolean).length === 1, "Send exactly one id.");

/** The person's country, an ISO 3166-1 alpha-2 code from the shared list. */
export const countryInput = z.object({ country: z.string().trim().length(2, "Choose your country from the list.").transform((v) => v.toUpperCase()) });

const providerIds = BYO_PROVIDERS.map((p) => p.id) as [string, ...string[]];

export const byoKeyInput = z.object({
  provider: z.enum(providerIds),
  model: z.string().trim().min(1, "Enter a model name.").max(100, "That model name is too long."),
  apiKey: z
    .string()
    .trim()
    .min(8, "That key looks too short.")
    .max(400, "That key is too long.")
    .regex(/^\S+$/, "A key has no spaces."),
});

/** What an admin may change on a plan. Prices are in the smallest currency unit (paise); features are short lines shown on the pricing page. */
export const planPatchInput = z.object({
  name: z.string().trim().min(1, "A plan needs a name.").max(60).optional(),
  tagline: z.string().trim().max(200).optional(),
  price_cents: z.number().int().min(0).max(10_000_000).optional(),
  currency: z.literal("inr").optional(), // a plan's base price is in rupees; the dollar price is its own field below
  /** The dollar price (US cents) people outside India pay. 0 on a paid plan = not offered in dollars yet. */
  price_cents_usd: z.number().int().min(0).max(10_000_000).optional(),
  token_price_cents_per_million_usd: z.number().int().min(0).max(100_000_000).optional(),
  interval: z.enum(["month", "year", "none"]).optional(),
  included_tokens: z.number().int().min(0).max(1_000_000_000_000).optional(),
  token_price_cents_per_million: z.number().int().min(0).max(100_000_000).optional(),
  features: z.array(z.string().trim().min(1).max(120)).max(12).optional(),
  trial_days: z.number().int().min(0, "Use 0 for no free trial.").max(90, "A trial can be at most 90 days.").optional(),
  active: z.boolean().optional(),
  sort: z.number().int().min(0).max(100).optional(),
});
export type PlanPatchInput = z.infer<typeof planPatchInput>;

/** What Razorpay's checkout window hands back after a payment. */
export const checkoutConfirmInput = z.object({
  paymentId: z.string().trim().min(1).max(100),
  subscriptionId: z.string().trim().min(1).max(100),
  signature: z.string().trim().min(1).max(200),
});

/** A top-up in paise or cents (whole rupees or dollars); the service checks the limits in the person's own currency. */
export const topupInput = z.object({ amountCents: z.number().int().min(100).max(100_000_000), client: z.enum(["web", "app"]).default("web") });
export const topupConfirmInput = z.object({
  paymentId: z.string().trim().min(1).max(100),
  orderId: z.string().trim().min(1).max(100),
  signature: z.string().trim().min(1).max(200),
});

/** The top-up limits an admin may set, in rupees and in dollars: whole units, a sensible range, and one to six quick amounts inside it. */
const limitsFor = (unit: string, minFloor: number) =>
  z
    .object({
      min: z.number().int().min(minFloor, `The minimum is at least ${unit === "$" ? "$1" : "₹1"}.`).max(10_000_000).refine((v) => v % 100 === 0, "Use whole amounts."),
      max: z.number().int().min(100).max(100_000_000).refine((v) => v % 100 === 0, "Use whole amounts."),
      options: z.array(z.number().int().refine((v) => v % 100 === 0, "Use whole amounts.")).min(1, "Add at least one quick amount.").max(6, "At most six quick amounts."),
    })
    .superRefine((v, ctx) => {
      if (v.max < v.min) ctx.addIssue({ code: "custom", message: "The maximum can’t be below the minimum." });
      if (v.options.some((o) => o < v.min || o > v.max)) ctx.addIssue({ code: "custom", message: "Every quick amount must be between the minimum and the maximum." });
    });
export const billingSettingsInput = z
  .object({
    topup_min_cents: z.number().int(),
    topup_max_cents: z.number().int(),
    topup_options_cents: z.array(z.number().int()),
    topup_min_cents_usd: z.number().int(),
    topup_max_cents_usd: z.number().int(),
    topup_options_cents_usd: z.array(z.number().int()),
  })
  .superRefine((v, ctx) => {
    for (const [unit, min, max, options, prefix] of [
      ["₹", v.topup_min_cents, v.topup_max_cents, v.topup_options_cents, "topup_"],
      ["$", v.topup_min_cents_usd, v.topup_max_cents_usd, v.topup_options_cents_usd, "topup_usd_"],
    ] as const) {
      const r = limitsFor(unit, 100).safeParse({ min, max, options });
      if (!r.success) for (const i of r.error.issues) ctx.addIssue({ code: "custom", message: `${unit === "$" ? "Dollars: " : "Rupees: "}${i.message}`, path: [prefix] });
    }
  });

/** An admin adjusting someone's AI credit, in paise (positive adds, negative takes away). */
export const creditAdjustInput = z.object({
  userId: z.string().uuid(),
  amountCents: z.number().int().min(-100_000_000).max(100_000_000).refine((v) => v !== 0, "Enter an amount."),
});

/** The seller details printed on every invoice. All optional: an empty field is simply left off the invoice. */
export const sellerInput = z.object({
  seller_name: z.string().trim().max(120, "That name is too long."),
  seller_address: z.string().trim().max(400, "That address is too long."),
  seller_tax_id: z.string().trim().max(40, "That tax id is too long."),
  invoice_footer: z.string().trim().max(600, "That footer is too long."),
});
