"use client";
import type { BillingInvoice } from "@untitled/types";
import { formatBalance } from "@untitled/logic/billing";
import { useInvoices } from "./queries";

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/** Billing history: one row per payment taken (subscription charges and AI credit top-ups), each opening its printable invoice. */
export default function BillingHistory() {
  const q = useInvoices();
  const rows: BillingInvoice[] = q.data ?? [];
  return (
    <section className="flex flex-col gap-3" aria-label="Billing history">
      <h2 className="m-0 text-[15px] font-semibold">Billing history</h2>
      {q.isError ? (
        <p className="form-err" role="alert">
          Couldn’t load your invoices. Try again in a moment.
        </p>
      ) : q.isPending ? (
        <p className="ap-none">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="ap-none">No payments yet. Invoices for subscription charges and credit top-ups appear here.</p>
      ) : (
        <div className="overflow-x-auto rounded-r3 border">
          <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b text-[12.5px] text-ink-3">
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Description</th>
                <th className="px-4 py-2.5 font-medium">Invoice</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 whitespace-nowrap" suppressHydrationWarning>
                    {day(r.issued_at)}
                  </td>
                  <td className="px-4 py-3">
                    {r.description}
                    {r.status !== "paid" && (
                      <span className="ml-2 rounded-xs bg-hover px-1.5 py-0.5 text-[12px] text-ink-2">
                        {r.status === "refunded" ? "Refunded" : `Refunded ${formatBalance(r.refunded_cents, r.currency)}`}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] text-ink-2">{r.number}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{formatBalance(r.amount_cents, r.currency)}</td>
                  <td className="px-4 py-3 text-right">
                    <a className="underline" href={`/invoice/${r.id}`} target="_blank" rel="noopener noreferrer" aria-label={`Open invoice ${r.number}`}>
                      Invoice
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
