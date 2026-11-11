"use client";
import { useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import type { BillingPlan } from "@untitled/types";
import { estimatePlans, formatBalance, formatMoney, formatTokens, tokenCostCents } from "@untitled/logic/billing";
import { Surface } from "./ui";

/** Rough size of one exchange (your message, the context sent with it and the reply), in tokens. A guide, not a measurement. */
const SIZES = {
  short: { label: "Quick questions", hint: "a line or two each way", tokens: 400 },
  typical: { label: "Everyday chats", hint: "a few paragraphs", tokens: 1_500 },
  long: { label: "Long drafts and documents", hint: "pages of text", tokens: 4_000 },
} as const;
type Size = keyof typeof SIZES;
const DAYS = 30;

/**
 * The pricing calculator: how many AI exchanges a day, how long they are, and what each plan would cost for that. Every number comes
 * from the plan rows (Admin → Plans) through `estimatePlans`, so a price change shows here without a deploy; nothing is hard-coded.
 */
export default function PricingCalculator({ plans, minTopupCents }: { plans: BillingPlan[]; minTopupCents: number }) {
  const [perDay, setPerDay] = useState(20);
  const [size, setSize] = useState<Size>("typical");
  const tokens = perDay * DAYS * SIZES[size].tokens;
  const { estimates, best } = estimatePlans(tokens, plans);
  const payg = plans.find((p) => p.id === "payg");
  const per100 = payg ? formatBalance(Math.max(1, tokenCostCents(100, payg.token_price_cents_per_million)), payg.currency) : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <Surface radius="r4" className="flex flex-col gap-7 p-7 sm:p-9">
        <div className="grid gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="calc-per-day" className="text-[15px] font-medium text-fg">
              AI chats a day
            </label>
            <output htmlFor="calc-per-day" className="font-serif text-[28px] font-semibold leading-none tracking-[-0.02em]">
              {perDay}
            </output>
          </div>
          <input
            id="calc-per-day"
            type="range"
            min={1}
            max={200}
            value={perDay}
            onChange={(e) => setPerDay(Number(e.target.value))}
            className="h-2 w-full cursor-pointer accent-ink"
            aria-valuetext={`${perDay} chats a day`}
          />
          <div className="flex justify-between text-[12.5px] text-fg-faint">
            <span>1</span>
            <span>200</span>
          </div>
        </div>

        <fieldset className="m-0 grid gap-3 border-0 p-0">
          <legend className="mb-1 p-0 text-[15px] font-medium text-fg">What are they like?</legend>
          <div className="grid gap-2" role="radiogroup">
            {(Object.keys(SIZES) as Size[]).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={size === k}
                onClick={() => setSize(k)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-r3 px-4 py-3 text-left text-[15px] ring-1 transition-colors ${
                  size === k ? "bg-hover text-fg ring-ink" : "text-fg-muted ring-line hover:bg-hover"
                }`}
              >
                <span>
                  <b className="block font-medium text-fg">{SIZES[k].label}</b>
                  <small className="text-[13px] text-fg-subtle">{SIZES[k].hint}</small>
                </span>
                {size === k && <FA icon={faCheck} className="text-[12px]" />}
              </button>
            ))}
          </div>
        </fieldset>

        <p className="m-0 text-[13.5px] leading-relaxed text-fg-subtle" aria-live="polite">
          About <b className="text-fg">{formatTokens(tokens)} tokens</b> a month.
          {per100 && (
            <>
              {" "}
              On Pay as you go, 100 tokens cost {per100}.
            </>
          )}{" "}
          This is an estimate to compare plans, not a quote: real use varies with how long your chats run.
        </p>
      </Surface>

      <ul className="m-0 grid list-none content-start gap-3 p-0" aria-label="What each plan would cost">
        {plans.map((p) => {
          const e = estimates.find((x) => x.id === p.id)!;
          const isBest = best === p.id;
          return (
            <li key={p.id}>
              <Surface radius="r4" className={`flex flex-col gap-2 p-6 ${isBest ? "ring-2 ring-green-fg" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="m-0 text-[17px] font-semibold text-fg">{p.name}</h3>
                  {isBest && <span className="rounded-pill bg-green-bg px-3 py-1 text-[12px] font-medium text-green-fg">Best for this much use</span>}
                </div>
                <p className="m-0 font-serif text-[34px] font-semibold leading-none tracking-[-0.022em] text-fg">
                  {p.id === "byo" ? "₹0" : formatBalance(e.monthlyCents, p.currency)}
                  <span className="ml-2 font-sans text-[14px] font-normal tracking-normal text-fg-subtle">
                    {p.id === "byo" ? "from Naazhi" : "a month"}
                  </span>
                </p>
                <p className="m-0 text-[14.5px] leading-relaxed text-fg-muted">
                  {p.id === "byo" && "You pay your AI provider directly, at their rates. Naazhi doesn’t count or charge for it."}
                  {p.id === "payg" && `Top up credit (from ${formatMoney(minTopupCents)}) and tokens come off it as you use AI. Nothing is charged for a month you don’t use it.`}
                  {p.id === "subscription" &&
                    (e.covers
                      ? `Covers it: this would use ${e.allowanceUsedPct ?? 0}% of the ${formatTokens(p.included_tokens)}-token monthly allowance.`
                      : `Doesn’t cover it: this is ${e.allowanceUsedPct}% of the ${formatTokens(p.included_tokens)}-token allowance, so AI would pause part-way through the month.`)}
                </p>
              </Surface>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
