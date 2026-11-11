"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { InvoiceAdminRow } from "../../server/repositories/invoices.repository";
import { formatBalance } from "@untitled/logic/billing";
import { usePrompt } from "../ui/Confirm";
import { refundInvoiceAction } from "../../app/admin/invoices/actions";

const STATUS: Record<InvoiceAdminRow["status"], string> = { paid: "Paid", partially_refunded: "Partly refunded", refunded: "Refunded" };

/** Search by email or invoice number, and refund. Refunding asks for the amount (defaults to everything left) and tells you the result. */
export default function InvoicesTable({ rows, query }: { rows: InvoiceAdminRow[]; query: string }) {
  const router = useRouter();
  const [q, setQ] = useState(query);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const { prompt, dialog } = usePrompt();

  const refund = async (r: InvoiceAdminRow) => {
    const left = r.amount_cents - r.refunded_cents;
    const v = await prompt({
      title: `Refund ${r.number}`,
      body: `${formatBalance(left, r.currency)} can still be refunded to ${r.bill_to_email || "this person"}. It goes back to the card, UPI or bank they paid with.`,
      label: "Amount in rupees",
      initial: String(left / 100),
      confirmLabel: "Refund",
      validate: (x) => (Number.isFinite(Number(x)) && Number(x) >= 1 && Math.round(Number(x) * 100) <= left ? null : `Enter an amount from 1 to ${left / 100}.`),
    });
    if (v === null) return;
    start(async () => {
      setNote(null);
      const res = await refundInvoiceAction(r.id, Math.round(Number(v) * 100));
      setNote(res.ok ? { ok: true, text: res.message ?? "Refunded." } : { ok: false, text: res.error });
      if (res.ok) router.refresh();
    });
  };

  return (
    <>
      {dialog}
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(q.trim() ? `/admin/invoices?q=${encodeURIComponent(q.trim())}` : "/admin/invoices");
        }}
        role="search"
      >
        <input
          className="h-10 min-w-0 flex-1 rounded-r2 border-0 bg-surface-muted px-3 font-sans text-[14px] text-fg placeholder:text-fg-subtle focus:bg-surface"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by email, name or invoice number"
          aria-label="Search invoices"
          maxLength={80}
        />
        <button className="btn btn-secondary btn-sm">Search</button>
      </form>
      {note && (
        <p className={note.ok ? "m-0 mb-3 text-[13.5px] text-green-fg" : "form-err"} role={note.ok ? "status" : "alert"}>
          {note.text}
        </p>
      )}
      <div className="dash-table">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Billed to</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="meta">
                  {query ? "No invoices match that." : "No invoices yet."}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <b className="font-mono text-[13px]">{r.number}</b>
                  <br />
                  <small className="meta" suppressHydrationWarning>
                    {new Date(r.issued_at).toLocaleDateString()}
                  </small>
                </td>
                <td>
                  {r.bill_to_name || r.bill_to_email.split("@")[0]}
                  <br />
                  <small className="meta">{r.bill_to_email}</small>
                </td>
                <td>{r.description}</td>
                <td>
                  {formatBalance(r.amount_cents, r.currency)}
                  {r.refunded_cents > 0 && (
                    <>
                      <br />
                      <small className="meta">Refunded {formatBalance(r.refunded_cents, r.currency)}</small>
                    </>
                  )}
                </td>
                <td>{STATUS[r.status]}</td>
                <td>
                  <a className="text-[13px] text-fg-muted underline" href={`/invoice/${r.id}`} target="_blank" rel="noopener noreferrer" aria-label={`Open invoice ${r.number}`}>
                    View
                  </a>
                  {r.status !== "refunded" && (
                    <>
                      {" · "}
                      <button type="button" className="cursor-pointer text-[13px] text-fg-muted underline" disabled={pending} onClick={() => refund(r)}>
                        Refund
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
