"use client";
import { useState } from "react";
import type { MyBilling } from "@untitled/types";
import { formatMoney, tokenCostCents, validTopup } from "@untitled/logic/billing";
import Modal from "../../components/ui/Modal";
import { useTopUp } from "./razorpay";

/** "Add AI credit": pick an amount (or type one), pay with Razorpay, and the credit is added once the payment is verified. */
export default function TopUpDialog({ billing, onClose }: { billing: MyBilling; onClose: () => void }) {
  const [amount, setAmount] = useState<number>(billing.topup.options_cents[1] ?? billing.topup.min_cents);
  const [custom, setCustom] = useState("");
  const [err, setErr] = useState("");
  const { topUp, busy } = useTopUp(setErr, onClose);
  const rate = billing.plan?.token_price_cents_per_million ?? 0;
  const typed = custom.trim() === "" ? null : Math.round(Number(custom) * 100);
  const cents = typed ?? amount;
  const ok = validTopup(cents);
  const per100 = formatMoney(Math.max(1, tokenCostCents(100, rate)), "inr");

  return (
    <Modal label="Add AI credit" onClose={onClose} size="sm">
      <form
        className="grid gap-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) void topUp(cents);
        }}
      >
        <div>
          <h2 className="m-0 text-[22px] font-semibold tracking-[-0.02em]">Add AI credit</h2>
          <p className="m-0 mt-1.5 text-[14.5px] text-ink-3">
            Tokens come off your balance as you use AI: 100 tokens cost {per100}. AI pauses when the balance reaches zero.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Amount">
          {billing.topup.options_cents.map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={typed === null && amount === o}
              className="tab h-11 justify-center text-[15px]"
              aria-selected={typed === null && amount === o}
              onClick={() => {
                setAmount(o);
                setCustom("");
              }}
            >
              {formatMoney(o, "inr")}
            </button>
          ))}
        </div>
        <label className="grid gap-1.5 text-[13.5px] text-ink-2">
          <span>Or enter an amount in rupees</span>
          <input
            className="h-10 rounded-ctl border bg-paper px-3 text-[15px] text-ink outline-none focus:border-ink"
            inputMode="numeric"
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, ""))}
            placeholder={`${billing.topup.min_cents / 100} or more`}
            aria-describedby="topup-limits"
          />
        </label>
        <p id="topup-limits" className="m-0 text-[12.5px] text-ink-3">
          From {formatMoney(billing.topup.min_cents, "inr")} to {formatMoney(billing.topup.max_cents, "inr")} at a time, in whole rupees.
        </p>
        {err && (
          <p className="form-err m-0" role="alert">
            {err}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary btn-sm" disabled={!ok || busy}>
            {busy ? "Opening payment…" : `Pay ${ok ? formatMoney(cents, "inr") : ""}`.trim()}
          </button>
        </div>
      </form>
    </Modal>
  );
}
