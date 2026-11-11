"use client";
import { useState, useTransition } from "react";
import type { BillingPlan, PlanId } from "@untitled/types";
import { formatBalance, formatTokens } from "@untitled/logic/billing";
import { usePrompt } from "../ui/Confirm";
import type { SubscriberRow } from "../../server/repositories/billing.repository";
import { adjustCredit, setUserPlan } from "../../app/admin/plans/actions";

/** Who is on which plan, with 30 days of token use. An admin can move a person to another plan or off all plans. Counts only, never content. */
export default function SubscribersTable({ rows, plans }: { rows: SubscriberRow[]; plans: BillingPlan[] }) {
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const { prompt, dialog } = usePrompt();
  const adjust = async (r: SubscriberRow) => {
    const v = await prompt({
      title: `Adjust credit for ${r.name || r.email}`,
      body: `Balance is ${formatBalance(r.credit_cents)}. Enter rupees to add (500) or remove (-200).`,
      label: "Amount in rupees",
      placeholder: "500",
      confirmLabel: "Apply",
      validate: (x) => (Number.isFinite(Number(x)) && Number(x) !== 0 && Math.abs(Number(x)) <= 1_000_000 ? null : "Enter a number such as 500 or -200."),
    });
    if (v === null) return;
    start(async () => {
      setErr("");
      const res = await adjustCredit(r.user_id, Math.round(Number(v) * 100));
      if (!res.ok) setErr(res.error);
    });
  };
  const change = (userId: string, value: string) =>
    start(async () => {
      setErr("");
      const r = await setUserPlan(userId, value === "" ? null : (value as PlanId));
      if (!r.ok) setErr(r.error);
    });

  return (
    <>
      {dialog}
      {err && (
        <p className="form-err" role="alert">
          {err}
        </p>
      )}
      <div className="dash-table">
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Period ends</th>
              <th>Tokens (30 days)</th>
              <th>AI credit</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="meta">
                  Nobody has chosen a plan yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.user_id}>
                <td>
                  <b>{r.name || r.email.split("@")[0]}</b>
                  <br />
                  <small className="meta">{r.email}</small>
                </td>
                <td>
                  <select
                    className="h-9 rounded-r1 border-0 bg-surface-muted px-2.5 font-sans text-[13.5px] text-fg"
                    value={r.plan_id}
                    disabled={pending}
                    onChange={(e) => change(r.user_id, e.target.value)}
                    aria-label={`Plan for ${r.email}`}
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                    <option value="">No plan</option>
                  </select>
                </td>
                <td>{r.status === "active" ? (r.cancel_at_period_end ? "Cancels at period end" : "Active") : "Cancelled"}</td>
                <td suppressHydrationWarning>{r.period_end ? new Date(r.period_end).toLocaleDateString() : "–"}</td>
                <td>{formatTokens(r.tokens_30d)}</td>
                <td>
                  {formatBalance(r.credit_cents)}{" "}
                  <button type="button" className="cursor-pointer text-[13px] text-fg-muted underline" disabled={pending} onClick={() => adjust(r)}>
                    Adjust
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
