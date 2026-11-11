import "server-only";
import type { BillingInvoice } from "@untitled/types";
import { withOwner, withUser } from "../db/pool";

/**
 * Data access for invoices and the seller details printed on them. People read their own invoices as themselves (row-level security
 * scopes it); creating one runs as the owner on purpose, from the billing service after a payment has been verified with Razorpay.
 */
const COLS = `id, number, kind, description, amount_cents::float8 as amount_cents, currency, status, refunded_cents::float8 as refunded_cents, period_start, period_end, issued_at`;

export type InvoiceFull = BillingInvoice & { bill_to_name: string; bill_to_email: string; provider_payment_id: string };
export type InvoiceAdminRow = InvoiceFull & { user_id: string };

export type NewInvoice = {
  userId: string;
  kind: "subscription" | "topup";
  description: string;
  amountCents: number;
  paymentId: string;
  ref: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  billToName: string;
  billToEmail: string;
};

/** Creates the invoice for a payment, once: returns it, or null when that payment already has one. */
export const createInvoice = (n: NewInvoice) =>
  withOwner(
    async (c) =>
      (await c.query<BillingInvoice>(
        `insert into public.billing_invoices
           (number, user_id, kind, description, amount_cents, provider_payment_id, provider_ref, period_start, period_end, bill_to_name, bill_to_email)
         values ('NZ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.billing_invoice_seq')::text, 6, '0'),
                 $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         on conflict (provider_payment_id) do nothing
         returning ${COLS}`,
        [n.userId, n.kind, n.description, n.amountCents, n.paymentId, n.ref, n.periodStart, n.periodEnd, n.billToName, n.billToEmail],
      )).rows[0] ?? null,
  );

export const listInvoices = (userId: string, limit = 100) =>
  withUser(
    userId,
    async (c) => (await c.query<BillingInvoice>(`select ${COLS} from public.billing_invoices where user_id = $1 order by issued_at desc limit $2`, [userId, limit])).rows,
  );

export const getInvoice = (userId: string, id: string) =>
  withUser(
    userId,
    async (c) =>
      (await c.query<InvoiceFull>(`select ${COLS}, bill_to_name, bill_to_email, provider_payment_id from public.billing_invoices where user_id = $1 and id = $2`, [userId, id])).rows[0] ?? null,
  );

export type SellerDetails = { seller_name: string; seller_address: string; seller_tax_id: string; invoice_footer: string };

export const getSeller = () =>
  withOwner(
    async (c) =>
      (await c.query<SellerDetails>("select seller_name, seller_address, seller_tax_id, invoice_footer from public.billing_settings where id")).rows[0] ?? {
        seller_name: "",
        seller_address: "",
        seller_tax_id: "",
        invoice_footer: "",
      },
  );

export const saveSeller = (s: SellerDetails) =>
  withOwner(
    async (c) =>
      void (await c.query(
        `insert into public.billing_settings (id, seller_name, seller_address, seller_tax_id, invoice_footer) values (true, $1, $2, $3, $4)
         on conflict (id) do update set seller_name = excluded.seller_name, seller_address = excluded.seller_address,
           seller_tax_id = excluded.seller_tax_id, invoice_footer = excluded.invoice_footer, updated_at = now()`,
        [s.seller_name, s.seller_address, s.seller_tax_id, s.invoice_footer],
      )),
  );

/* ---------- refunds and the admin's view ---------- */

/** Any invoice by id (the service has already checked the caller is an admin). */
export const getInvoiceAny = (id: string) =>
  withOwner(
    async (c) =>
      (await c.query<InvoiceAdminRow>(`select ${COLS}, bill_to_name, bill_to_email, provider_payment_id, user_id from public.billing_invoices where id = $1`, [id])).rows[0] ?? null,
  );

/** Recent invoices across everyone for the admin page, optionally narrowed by an email or invoice number. */
export const listAllInvoices = (search: string, limit = 200) =>
  withOwner(
    async (c) =>
      (await c.query<InvoiceAdminRow>(
        `select ${COLS.split(", ").map((x) => `i.${x}`).join(", ")}, i.bill_to_name, i.bill_to_email, i.provider_payment_id, i.user_id
         from public.billing_invoices i
         where $1 = '' or i.number ilike '%' || $1 || '%' or i.bill_to_email ilike '%' || $1 || '%' or i.bill_to_name ilike '%' || $1 || '%'
         order by i.issued_at desc limit $2`,
        [search, limit],
      )).rows,
  );

/**
 * Records a refund against the invoice of a payment, once: a second call with the same refund id changes nothing. Returns the invoice
 * and how much was applied, or null when the payment has no invoice or the refund was already recorded. The invoice never shows more
 * returned than it was paid.
 */
export const recordRefundRow = (refundId: string, paymentId: string, amountCents: number) =>
  withOwner(async (c) => {
    const inv = (await c.query<{ id: string; user_id: string; kind: "subscription" | "topup"; number: string; amount_cents: number; currency: string; bill_to_email: string; refunded_cents: number }>(
      "select id, user_id, kind, number, amount_cents::float8 as amount_cents, currency, bill_to_email, refunded_cents::float8 as refunded_cents from public.billing_invoices where provider_payment_id = $1 for update",
      [paymentId],
    )).rows[0];
    if (!inv) return null;
    const applied = Math.max(0, Math.min(amountCents, inv.amount_cents - inv.refunded_cents));
    if (applied <= 0) return null;
    const ins = await c.query("insert into public.billing_refunds (id, invoice_id, amount_cents) values ($1, $2, $3) on conflict (id) do nothing", [refundId, inv.id, applied]);
    if (ins.rowCount === 0) return null;
    const total = inv.refunded_cents + applied;
    await c.query("update public.billing_invoices set refunded_cents = $2, status = $3 where id = $1", [inv.id, total, total >= inv.amount_cents ? "refunded" : "partially_refunded"]);
    return { ...inv, applied, total };
  });
