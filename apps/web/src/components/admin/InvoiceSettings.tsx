"use client";
import { useState, useTransition } from "react";
import { saveInvoiceDetails } from "../../app/admin/plans/actions";

const INPUT =
  "h-10 w-full rounded-r2 border-0 bg-surface-muted px-3 font-sans text-[14px] text-fg placeholder:text-fg-subtle focus:bg-surface";
const AREA = `${INPUT} h-auto min-h-[84px] resize-y py-2.5 leading-relaxed`;

/** The seller details printed on every invoice (the From block and footer). Leave a field empty to leave it off the invoice. */
export default function InvoiceSettings({ seller }: { seller: { seller_name: string; seller_address: string; seller_tax_id: string; invoice_footer: string } }) {
  const [v, setV] = useState(seller);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  return (
    <form
      className="grid gap-4 rounded-r3 border bg-paper p-5 max-[700px]:p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveInvoiceDetails(v);
          setNote(r.ok ? { ok: true, text: r.message ?? "Saved." } : { ok: false, text: r.error });
        });
      }}
    >
      <p className="m-0 text-[13.5px] text-fg-muted">
        Shown in the “From” block of every invoice. No tax is calculated: an invoice shows the amount paid, so put your tax or GST id here only if you are
        registered, and check the layout with your accountant.
      </p>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <label className="grid content-start gap-1.5">
          <span className="text-[12.5px] text-fg-subtle">Business name</span>
          <input className={INPUT} value={v.seller_name} onChange={set("seller_name")} maxLength={120} placeholder="Naazhi" />
        </label>
        <label className="grid content-start gap-1.5">
          <span className="text-[12.5px] text-fg-subtle">Tax or GST id</span>
          <input className={INPUT} value={v.seller_tax_id} onChange={set("seller_tax_id")} maxLength={40} />
        </label>
      </div>
      <label className="grid content-start gap-1.5">
        <span className="text-[12.5px] text-fg-subtle">Address</span>
        <textarea className={AREA} value={v.seller_address} onChange={set("seller_address")} maxLength={400} rows={3} />
      </label>
      <label className="grid content-start gap-1.5">
        <span className="text-[12.5px] text-fg-subtle">Footer (a line of terms or thanks)</span>
        <textarea className={AREA} value={v.invoice_footer} onChange={set("invoice_footer")} maxLength={600} rows={2} />
      </label>
      <div className="flex justify-end">
        <button className="btn btn-primary btn-sm" disabled={pending}>
          {pending ? "Saving…" : "Save invoice details"}
        </button>
      </div>
      {note && (
        <p className={note.ok ? "m-0 text-[13.5px] text-green-fg" : "form-err"} role={note.ok ? "status" : "alert"}>
          {note.text}
        </p>
      )}
    </form>
  );
}
