"use server";
import { revalidatePath } from "next/cache";
import type { PlanId } from "@untitled/types";
import { ServiceError } from "../../../server/errors";
import { audit, assertAdmin, getUserById } from "../../../server/session";
import { saveSeller } from "../../../server/services/billing/invoices.service";
import { adminAdjustCredit, adminSaveSettings, adminSetUserPlan, adminUpdatePlan } from "../../../server/services/billing/billing.service";
import { billingSettingsInput, creditAdjustInput, planIdInput, planPatchInput, sellerInput } from "../../../server/services/billing/billing.schema";

type Result = { ok: true; message?: string } | { ok: false; error: string };
const UUID = /^[0-9a-f-]{36}$/i;

/** Edits a plan's price, allowance, rate, wording or availability. The pricing page and Settings read the same rows, so it shows everywhere at once. */
export async function savePlan(id: string, patch: unknown): Promise<Result> {
  try {
    const me = await assertAdmin();
    const plan = planIdInput.safeParse({ planId: id });
    const parsed = planPatchInput.safeParse(patch);
    if (!plan.success) return { ok: false, error: "That plan doesn’t exist." };
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "That doesn’t look right." };
    await adminUpdatePlan(plan.data.planId, parsed.data);
    await audit(me, "plan.update", plan.data.planId, { fields: Object.keys(parsed.data) });
    revalidatePath("/admin/plans");
    revalidatePath("/pricing");
    return { ok: true, message: "Plan saved." };
  } catch (e) {
    return { ok: false, error: e instanceof ServiceError ? e.message : "Not allowed." };
  }
}

/** Puts a person on a plan, or off every plan with null. Used for support and for people who pay outside the app. */
export async function setUserPlan(userId: string, planId: PlanId | null): Promise<Result> {
  try {
    const me = await assertAdmin();
    if (typeof userId !== "string" || !UUID.test(userId)) return { ok: false, error: "Bad user id." };
    if (planId !== null && !planIdInput.safeParse({ planId }).success) return { ok: false, error: "That plan doesn’t exist." };
    const user = await getUserById(userId);
    if (!user) return { ok: false, error: "User not found." };
    await adminSetUserPlan(userId, planId);
    await audit(me, planId ? "plan.assign" : "plan.clear", user.email || userId, { plan: planId });
    revalidatePath("/admin/plans");
    return { ok: true, message: planId ? "Plan updated." : "Plan removed." };
  } catch (e) {
    return { ok: false, error: e instanceof ServiceError ? e.message : "Not allowed." };
  }
}

/** Saves the AI credit top-up limits and quick amounts (the dialog and the server both read them). */
export async function saveBillingSettings(input: unknown): Promise<Result> {
  try {
    const me = await assertAdmin();
    const parsed = billingSettingsInput.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "That doesn’t look right." };
    await adminSaveSettings(parsed.data);
    await audit(me, "billing.settings", "topup", { min: parsed.data.topup_min_cents, max: parsed.data.topup_max_cents, options: parsed.data.topup_options_cents });
    revalidatePath("/admin/plans");
    revalidatePath("/pricing");
    return { ok: true, message: "Credit settings saved." };
  } catch (e) {
    return { ok: false, error: e instanceof ServiceError ? e.message : "Not allowed." };
  }
}

/** Adds or removes AI credit for one person (support or a correction), recorded as an adjustment in their ledger. */
export async function adjustCredit(userId: string, amountCents: number): Promise<Result> {
  try {
    const me = await assertAdmin();
    const parsed = creditAdjustInput.safeParse({ userId, amountCents });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "That doesn’t look right." };
    const user = await getUserById(userId);
    if (!user) return { ok: false, error: "User not found." };
    const balance = await adminAdjustCredit(userId, parsed.data.amountCents);
    await audit(me, "credit.adjust", user.email || userId, { amount_cents: parsed.data.amountCents });
    revalidatePath("/admin/plans");
    return { ok: true, message: `Balance is now ₹${(balance / 100).toFixed(2)}.` };
  } catch (e) {
    return { ok: false, error: e instanceof ServiceError ? e.message : "Not allowed." };
  }
}

/** Saves the seller details printed on invoices (name, address, tax id, footer). */
export async function saveInvoiceDetails(input: unknown): Promise<Result> {
  try {
    const me = await assertAdmin();
    const parsed = sellerInput.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "That doesn’t look right." };
    await saveSeller(parsed.data);
    await audit(me, "billing.invoice_details", "seller", { fields: Object.keys(parsed.data) });
    revalidatePath("/admin/plans");
    return { ok: true, message: "Invoice details saved." };
  } catch (e) {
    return { ok: false, error: e instanceof ServiceError ? e.message : "Not allowed." };
  }
}
