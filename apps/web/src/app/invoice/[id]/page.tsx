import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { formatBalance } from "@untitled/logic/billing";
import { BrandMark } from "../../../components/BrandMark";
import { currentUser, isAdmin } from "../../../server/session";
import { invoiceView, invoiceViewAny, verifyInvoiceLink } from "../../../server/services/billing/invoices.service";
import PrintButton from "./PrintButton";

export const metadata: Metadata = { title: "Invoice — Naazhi", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

/** A printable invoice. Only its owner can open it (the query runs as the signed-in person, so row-level security decides). "Print" saves it as a PDF. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const { id } = await params;
  const { t } = await searchParams;
  if (!UUID.test(id)) notFound();
  const user = await currentUser();
  // The phone app opens an invoice with a short-lived signed link instead of a browser sign-in (see invoiceLink).
  const linkedUser = user ? null : verifyInvoiceLink(t, id);
  if (!user && !linkedUser) redirect(`/login?next=${encodeURIComponent(`/invoice/${id}`)}`);
  // An admin can open any invoice (support); everyone else only their own.
  const view = await (user && isAdmin(user) ? invoiceViewAny(id) : invoiceView(user?.id ?? linkedUser!, id)).catch(() => null);
  if (!view) notFound();
  const { invoice: i, seller } = view;
  const money = formatBalance(i.amount_cents, i.currency);

  return (
    <main className="mx-auto w-full max-w-[760px] px-5 py-10 print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        {user ? (
          <a href="/dashboard/settings/billing" className="text-[14px] text-ink-2 underline">
            Back to Plans &amp; billing
          </a>
        ) : (
          <span />
        )}
        <PrintButton />
      </div>

      <article className="rounded-r4 border bg-raised p-8 sm:p-10 print:rounded-none print:border-0 print:p-0" aria-label={`Invoice ${i.number}`}>
        <header className="flex flex-wrap items-start justify-between gap-6 border-b pb-6">
          <div className="flex items-center gap-2.5">
            <BrandMark size={28} />
            <span className="font-brand text-[24px] leading-none tracking-[-0.02em]">Naazhi</span>
          </div>
          <div className="text-right">
            <h1 className="m-0 text-[26px] leading-none font-semibold tracking-[-0.02em]">Invoice</h1>
            <p className="m-0 mt-2 font-mono text-[14px] text-ink-2">{i.number}</p>
          </div>
        </header>

        <div className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <h2 className="m-0 mb-1.5 text-[12px] font-medium tracking-[0.06em] text-ink-3 uppercase">From</h2>
            <p className="m-0 text-[14.5px] leading-relaxed text-ink">
              <b className="font-semibold">{seller.seller_name || "Naazhi"}</b>
              {seller.seller_address && (
                <>
                  <br />
                  <span className="whitespace-pre-line text-ink-2">{seller.seller_address}</span>
                </>
              )}
              {seller.seller_tax_id && (
                <>
                  <br />
                  <span className="text-ink-2">Tax ID: {seller.seller_tax_id}</span>
                </>
              )}
            </p>
          </div>
          <div>
            <h2 className="m-0 mb-1.5 text-[12px] font-medium tracking-[0.06em] text-ink-3 uppercase">Billed to</h2>
            <p className="m-0 text-[14.5px] leading-relaxed text-ink">
              <b className="font-semibold">{i.bill_to_name || i.bill_to_email}</b>
              {i.bill_to_name && (
                <>
                  <br />
                  <span className="text-ink-2">{i.bill_to_email}</span>
                </>
              )}
            </p>
          </div>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[14px] sm:col-span-2">
            <dt className="text-ink-3">Invoice date</dt>
            <dd className="m-0">{day(i.issued_at)}</dd>
            {i.period_start && i.period_end && (
              <>
                <dt className="text-ink-3">Covers</dt>
                <dd className="m-0">
                  {day(i.period_start)} to {day(i.period_end)}
                </dd>
              </>
            )}
            <dt className="text-ink-3">Payment</dt>
            <dd className="m-0">
              Razorpay, <span className="font-mono text-[13px]">{view.invoice.provider_payment_id}</span>
            </dd>
            <dt className="text-ink-3">Status</dt>
            <dd className="m-0">{i.status === "refunded" ? "Refunded" : i.status === "partially_refunded" ? "Partly refunded" : "Paid"}</dd>
          </dl>
        </div>

        <table className="w-full border-collapse text-left text-[14.5px]">
          <thead>
            <tr className="border-y text-[12.5px] text-ink-3">
              <th className="py-2.5 font-medium">Description</th>
              <th className="py-2.5 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-3.5">{i.description}</td>
              <td className="py-3.5 text-right">{money}</td>
            </tr>
            <tr>
              <td className="pt-4 text-[15px] font-semibold">Total paid</td>
              <td className="pt-4 text-right text-[20px] font-semibold">{money}</td>
            </tr>
            {i.refunded_cents > 0 && (
              <>
                <tr>
                  <td className="pt-3 text-ink-2">Refunded</td>
                  <td className="pt-3 text-right text-ink-2">−{formatBalance(i.refunded_cents, i.currency)}</td>
                </tr>
                <tr>
                  <td className="pt-2 font-semibold">Net</td>
                  <td className="pt-2 text-right font-semibold">{formatBalance(Math.max(0, i.amount_cents - i.refunded_cents), i.currency)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>

        {seller.invoice_footer && <p className="mt-8 mb-0 border-t pt-4 text-[13px] leading-relaxed whitespace-pre-line text-ink-3">{seller.invoice_footer}</p>}
        <p className="mt-6 mb-0 text-[12.5px] text-ink-3">Amounts are in Indian rupees. Questions about a payment? Reply to the receipt email or contact us from the website.</p>
      </article>
    </main>
  );
}
