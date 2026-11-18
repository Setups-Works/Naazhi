"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ServiceError } from "../../../server/errors";
import { assertAdmin, audit } from "../../../server/session";
import { formatBalance } from "@untitled/logic/billing";
import { refundInvoice } from "../../../server/services/billing/invoices.service";

type Result = { ok: true; message?: string } | { ok: false; error: string };
const input = z.object({ invoiceId: z.string().uuid(), amountCents: z.number().int().min(100).max(100_000_000) });

/** Refunds an invoice (in full or in part) through Razorpay (a payment Stripe took before it was removed is refused with a message). The invoice, the person's credit and their email follow from it. */
export async function refundInvoiceAction(invoiceId: string, amountCents: number): Promise<Result> {
  try {
    const me = await assertAdmin();
    const p = input.safeParse({ invoiceId, amountCents });
    if (!p.success) return { ok: false, error: "Enter a whole amount." };
    const { amountCents: amount, currency } = await refundInvoice(p.data.invoiceId, p.data.amountCents);
    await audit(me, "invoice.refund", p.data.invoiceId, { amount_cents: amount });
    revalidatePath("/admin/invoices");
    return { ok: true, message: `Refunded ${formatBalance(amount, currency)}.` };
  } catch (e) {
    return { ok: false, error: e instanceof ServiceError ? e.message : "Not allowed." };
  }
}
