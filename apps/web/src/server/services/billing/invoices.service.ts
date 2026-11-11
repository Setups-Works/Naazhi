import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { BillingInvoice } from "@untitled/types";
import { appHref, isSplit, publicPath } from "../../../lib/hosts";
import { serverEnv } from "../../../config/env";
import { sendEmail } from "../../mail";
import { templates } from "../../email/templates";
import * as billing from "../../repositories/billing.repository";
import * as repo from "../../repositories/invoices.repository";
import { ConflictError, NotFoundError, ValidationError } from "../../errors";
import * as razorpay from "../../providers/payments/razorpay";
import { formatBalance } from "@untitled/logic/billing";

/**
 * Invoices and the billing emails. An invoice is made from a payment the service has already verified with Razorpay (a subscription
 * charge or an AI credit top-up), once per payment, and the person is emailed the receipt. Emails never block or fail a payment: a mail
 * problem is swallowed, and the invoice is always there in Settings → Plans & billing. Never log amounts, names or addresses.
 */

/** An absolute link to a page of the app, correct whether the site and the app share a host or not. */
export function appLink(path: string): string {
  return isSplit() ? appHref(publicPath(path)) : `${serverEnv().authUrl.replace(/\/$/, "")}${path}`;
}
export const billingLink = () => appLink("/dashboard/settings/billing");

/** Makes the invoice for a verified payment (once) and emails the receipt. Returns the invoice, or null when the payment already had one. */
export async function issueInvoice(p: {
  userId: string;
  kind: "subscription" | "topup";
  description: string;
  amountCents: number;
  paymentId: string;
  ref?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
}): Promise<BillingInvoice | null> {
  const who = await billing.getContact(p.userId);
  const inv = await repo.createInvoice({
    userId: p.userId,
    kind: p.kind,
    description: p.description,
    amountCents: p.amountCents,
    paymentId: p.paymentId,
    ref: p.ref ?? null,
    periodStart: p.periodStart ?? null,
    periodEnd: p.periodEnd ?? null,
    billToName: who?.name ?? "",
    billToEmail: who?.email ?? "",
  });
  if (inv && who?.email)
    void sendEmail(
      who.email,
      templates.invoice({
        name: who.name,
        url: appLink(`/invoice/${inv.id}`),
        invoice: { number: inv.number, description: inv.description, amountCents: inv.amount_cents, currency: inv.currency, issuedAt: inv.issued_at, periodStart: inv.period_start, periodEnd: inv.period_end },
      }),
    ).catch(() => undefined);
  return inv;
}

/** Sends one of the billing notices (payment failed, subscription ended, credit finished) to the person, ignoring mail problems. */
export async function notifyBilling(userId: string, make: (url: string) => ReturnType<typeof templates.paymentFailed>) {
  const who = await billing.getContact(userId);
  if (who?.email) await sendEmail(who.email, make(billingLink())).catch(() => undefined);
}

export const listMyInvoices = (userId: string) => repo.listInvoices(userId);

/** An invoice with the seller details to print on it, or null when it isn't this person's. */
export async function invoiceView(userId: string, id: string) {
  const [invoice, seller] = await Promise.all([repo.getInvoice(userId, id), repo.getSeller()]);
  return invoice ? { invoice, seller } : null;
}

/** Any invoice with the seller details: for an admin looking at support requests (the page checks the role first). */
export async function invoiceViewAny(id: string) {
  const [invoice, seller] = await Promise.all([repo.getInvoiceAny(id), repo.getSeller()]);
  return invoice ? { invoice, seller } : null;
}

export const getSeller = () => repo.getSeller();
export const saveSeller = (s: repo.SellerDetails) => repo.saveSeller(s);

/* ---------- refunds ---------- */

/**
 * Records a refund (once per Razorpay refund id) against its invoice: the invoice shows what was returned, a refunded top-up comes off
 * the person's AI credit, and they are emailed. Used by the admin's refund and by Razorpay's `refund.processed` webhook, so a refund
 * made in either place (or in Razorpay's own dashboard) is applied exactly once.
 */
export async function recordRefund(refundId: string, paymentId: string, amountCents: number): Promise<boolean> {
  const r = await repo.recordRefundRow(refundId, paymentId, amountCents);
  if (!r) return false;
  if (r.kind === "topup") await billing.applyCredit(r.user_id, -r.applied, "adjust", { ref: `refund_${refundId}` }).catch(() => undefined);
  if (r.bill_to_email) void sendEmail(r.bill_to_email, templates.refundIssued({ number: r.number, amountCents: r.applied, currency: r.currency, url: appLink(`/invoice/${r.id}`) })).catch(() => undefined);
  return true;
}

/**
 * An admin refunds an invoice (in full or in part) through Razorpay. A top-up can only be refunded up to what is still unspent in the
 * person's balance (the rest has been used), so the balance never goes negative from a refund. Returns the amount refunded.
 */
export async function refundInvoice(invoiceId: string, amountCents: number): Promise<number> {
  const inv = await repo.getInvoiceAny(invoiceId);
  if (!inv) throw new NotFoundError("That invoice doesn’t exist.");
  const remaining = inv.amount_cents - inv.refunded_cents;
  if (!Number.isInteger(amountCents) || amountCents < 100 || amountCents > remaining)
    throw new ValidationError(`Refund between ₹1 and ${formatBalance(remaining, inv.currency)} (what hasn’t been refunded yet).`);
  if (inv.kind === "topup") {
    const unspent = Math.max(0, await billing.getCredit(inv.user_id));
    if (amountCents > unspent) throw new ValidationError(`Only ${formatBalance(unspent, inv.currency)} of this top-up is unspent, so that is the most that can be refunded.`);
  }
  let refund: razorpay.RazorpayRefund;
  try {
    refund = await razorpay.refundPayment(inv.provider_payment_id, amountCents, { invoice: inv.number });
  } catch {
    throw new ConflictError("Razorpay couldn’t refund that payment. It may already be refunded, or too old to refund from here.");
  }
  await recordRefund(refund.id, inv.provider_payment_id, amountCents);
  return amountCents;
}

export const adminListInvoices = (search: string) => repo.listAllInvoices(search.trim().slice(0, 80));

/* ---------- short-lived links for the phone app ---------- */

/**
 * The phone can't carry the web sign-in into its browser, so it asks for a link that opens one invoice for ten minutes: the person's
 * id, the invoice id and an expiry, signed with the server secret. It opens only that invoice, only for that person, and only briefly.
 */
const sign = (data: string) => createHmac("sha256", serverEnv().authSecret ?? "").update(`invoice-link:${data}`).digest("base64url");

export async function invoiceLink(userId: string, id: string): Promise<{ url: string }> {
  if (!(await repo.getInvoice(userId, id))) throw new NotFoundError("That invoice doesn’t exist.");
  const exp = Math.floor(Date.now() / 1000) + 600;
  const body = `${userId}.${id}.${exp}`;
  return { url: `${appLink(`/invoice/${id}`)}?t=${Buffer.from(body).toString("base64url")}.${sign(body)}` };
}

/** The person a link was made for, when it is genuine, unexpired and for this invoice; otherwise null. */
export function verifyInvoiceLink(token: string | undefined, id: string): string | null {
  const [b64, sig] = (token ?? "").split(".");
  if (!b64 || !sig) return null;
  try {
    const body = Buffer.from(b64, "base64url").toString("utf8");
    const [userId, invoiceId, exp] = body.split(".");
    const want = sign(body);
    if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
    if (invoiceId !== id || Number(exp) < Date.now() / 1000) return null;
    return userId || null;
  } catch {
    return null;
  }
}
