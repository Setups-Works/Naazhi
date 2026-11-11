import { z } from "zod";
import { BYO_PROVIDERS } from "@untitled/logic/billing";

export const planIdInput = z.object({ planId: z.enum(["subscription", "payg", "byo"]) });

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
  currency: z.literal("inr").optional(), // rupees only
  interval: z.enum(["month", "year", "none"]).optional(),
  included_tokens: z.number().int().min(0).max(1_000_000_000_000).optional(),
  token_price_cents_per_million: z.number().int().min(0).max(100_000_000).optional(),
  features: z.array(z.string().trim().min(1).max(120)).max(12).optional(),
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

/** A top-up in paise (whole rupees); the service checks the limits. */
export const topupInput = z.object({ amountCents: z.number().int().min(100).max(100_000_000) });
export const topupConfirmInput = z.object({
  paymentId: z.string().trim().min(1).max(100),
  orderId: z.string().trim().min(1).max(100),
  signature: z.string().trim().min(1).max(200),
});

/** The top-up limits an admin may set: whole rupees, a sensible range, and one to six quick amounts inside it. */
export const billingSettingsInput = z
  .object({
    topup_min_cents: z.number().int().min(100, "The minimum is at least ₹1.").max(10_000_000).refine((v) => v % 100 === 0, "Use whole rupees."),
    topup_max_cents: z.number().int().min(100).max(100_000_000).refine((v) => v % 100 === 0, "Use whole rupees."),
    topup_options_cents: z.array(z.number().int().refine((v) => v % 100 === 0, "Use whole rupees.")).min(1, "Add at least one quick amount.").max(6, "At most six quick amounts."),
  })
  .superRefine((v, ctx) => {
    if (v.topup_max_cents < v.topup_min_cents) ctx.addIssue({ code: "custom", message: "The maximum can’t be below the minimum." });
    if (v.topup_options_cents.some((o) => o < v.topup_min_cents || o > v.topup_max_cents))
      ctx.addIssue({ code: "custom", message: "Every quick amount must be between the minimum and the maximum." });
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
