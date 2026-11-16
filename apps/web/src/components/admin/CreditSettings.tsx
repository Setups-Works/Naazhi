"use client";
import { useState, useTransition } from "react";
import type { TopupLimits } from "@untitled/logic/billing";
import { formatMoney } from "@untitled/logic/billing";
import { saveBillingSettings } from "../../app/admin/plans/actions";

const INPUT =
  "h-10 w-full rounded-r2 border-0 bg-surface-muted px-3 font-sans text-[14px] text-fg placeholder:text-fg-subtle focus:bg-surface";
const rupees = (cents: number) => String(cents / 100);

/** AI credit top-ups (Pay as you go): the smallest and largest amount and the quick amounts the Top up dialog offers. Typed in whole rupees. */
export default function CreditSettings({ limits, limitsUsd }: { limits: TopupLimits; limitsUsd: TopupLimits }) {
  const [min, setMin] = useState(rupees(limits.minCents));
  const [max, setMax] = useState(rupees(limits.maxCents));
  const [options, setOptions] = useState(limits.optionsCents.map(rupees).join(", "));
  const [minUsd, setMinUsd] = useState(rupees(limitsUsd.minCents));
  const [maxUsd, setMaxUsd] = useState(rupees(limitsUsd.maxCents));
  const [optionsUsd, setOptionsUsd] = useState(limitsUsd.optionsCents.map(rupees).join(", "));
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const optionCents = options
    .split(/[,\s]+/)
    .filter(Boolean)
    .map((o) => Math.round(Number(o) * 100));
  const optionCentsUsd = optionsUsd
    .split(/[,\s]+/)
    .filter(Boolean)
    .map((o) => Math.round(Number(o) * 100));
  const ok =
    [min, max, minUsd, maxUsd].every((v) => Number.isInteger(Number(v)) && Number(v) >= 1) &&
    optionCents.length > 0 &&
    optionCents.every((o) => Number.isFinite(o) && o > 0) &&
    optionCentsUsd.length > 0 &&
    optionCentsUsd.every((o) => Number.isFinite(o) && o > 0);

  return (
    <form
      className="grid gap-4 rounded-r3 border bg-paper p-5 max-[700px]:p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveBillingSettings({
            topup_min_cents: Number(min) * 100, topup_max_cents: Number(max) * 100, topup_options_cents: optionCents,
            topup_min_cents_usd: Number(minUsd) * 100,
            topup_max_cents_usd: Number(maxUsd) * 100,
            topup_options_cents_usd: optionCentsUsd,
          });
          setNote(r.ok ? { ok: true, text: r.message ?? "Saved." } : { ok: false, text: r.error });
        });
      }}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="m-0 text-[20px] leading-none font-semibold tracking-[-0.02em]">AI credit top-ups</h3>
        <span className="text-[13.5px] text-fg-muted">
          Quick amounts: <b className="font-semibold text-fg">{ok ? optionCents.map((o) => formatMoney(o)).join(", ") : "–"}</b> · <b className="font-semibold text-fg">{ok ? optionCentsUsd.map((o) => formatMoney(o, "usd")).join(", ") : "–"}</b>
        </span>
      </header>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        <label className="grid content-start gap-1.5">
          <span className="text-[12.5px] text-fg-subtle">Smallest top-up (₹)</span>
          <input className={INPUT} value={min} onChange={(e) => setMin(e.target.value)} inputMode="numeric" />
        </label>
        <label className="grid content-start gap-1.5">
          <span className="text-[12.5px] text-fg-subtle">Largest top-up (₹)</span>
          <input className={INPUT} value={max} onChange={(e) => setMax(e.target.value)} inputMode="numeric" />
        </label>
        <label className="col-span-2 grid content-start gap-1.5 max-[500px]:col-span-1">
          <span className="text-[12.5px] text-fg-subtle">Quick amounts (₹, separated by commas, up to six)</span>
          <input className={INPUT} value={options} onChange={(e) => setOptions(e.target.value)} placeholder="100, 250, 500, 1000" />
        </label>
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        <label className="grid content-start gap-1.5">
          <span className="text-[12.5px] text-fg-subtle">Smallest top-up ($)</span>
          <input className={INPUT} value={minUsd} onChange={(e) => setMinUsd(e.target.value)} inputMode="numeric" />
        </label>
        <label className="grid content-start gap-1.5">
          <span className="text-[12.5px] text-fg-subtle">Largest top-up ($)</span>
          <input className={INPUT} value={maxUsd} onChange={(e) => setMaxUsd(e.target.value)} inputMode="numeric" />
        </label>
        <label className="col-span-2 grid content-start gap-1.5 max-[500px]:col-span-1">
          <span className="text-[12.5px] text-fg-subtle">Quick amounts ($, separated by commas, up to six)</span>
          <input className={INPUT} value={optionsUsd} onChange={(e) => setOptionsUsd(e.target.value)} placeholder="10, 25, 50, 100" />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <small className="text-[13px] text-fg-subtle">Whole rupees and whole dollars only. A payment already made is always credited, whatever the limits are now.</small>
        <button className="btn btn-primary btn-sm" disabled={pending || !ok}>
          {pending ? "Saving…" : "Save credit settings"}
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
