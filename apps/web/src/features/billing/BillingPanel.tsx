"use client";
import { useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faCheck, faKey } from "@fortawesome/free-solid-svg-icons";
import type { BillingPlan, MyBilling } from "@untitled/types";
import { BYO_PROVIDERS, byoProvider, formatBalance, formatMoney, formatTokens, needsCheckout, priceLine } from "@untitled/logic/billing";
import { useConfirm } from "../../components/ui/Confirm";
import { useBilling, useBillingActions } from "./queries";
import { usePlanPicker } from "./razorpay";
import TopUpDialog from "./TopUpDialog";
import BillingHistory from "./BillingHistory";
import ConnectAiDialog from "../../components/app/chat/ConnectAiDialog";
import { useAiCatalog } from "../ai/connections";

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

/** One line about where the current plan stands: when it renews or ends, or what this period has used. */
function standing(b: MyBilling): string {
  if (!b.plan)
    return b.status === "canceled"
      ? "Your last plan has ended. Choose a plan below to start again."
      : "You haven’t chosen a plan yet. AI works as it always has until you do.";
  if (b.plan.id === "subscription" && b.period_end)
    return b.cancel_at_period_end ? `Autopay is off. Ends on ${day(b.period_end)}; you keep everything until then.` : `Autopay is on. Next charge on ${day(b.period_end)}.`;
  if (b.plan.id === "payg")
    return `${formatTokens(b.tokens_used)} tokens used this period${b.cost_cents > 0 ? `, about ${formatMoney(b.cost_cents, b.plan.currency)}` : ""}.`;
  return b.byo.hint ? "Your own key is saved." : "Add your API key to start using AI.";
}

function KeyForm({ billing, onError }: { billing: MyBilling; onError: (m: string) => void }) {
  const { saveKey, removeKey } = useBillingActions(onError);
  const { ask, dialog } = useConfirm();
  const [provider, setProvider] = useState<string>(billing.byo.provider ?? BYO_PROVIDERS[0].id);
  const [model, setModel] = useState(billing.byo.model ?? BYO_PROVIDERS[0].model);
  const [apiKey, setApiKey] = useState("");
  const saved = billing.byo.hint;

  return (
    <div className="mt-5 rounded-r3 bg-surface-muted p-4">
      {dialog}
      <div className="mb-3 flex items-center gap-2.5 text-[14.5px] font-semibold">
        <FA icon={faKey} className="text-[13px] text-fg-muted" /> Your AI provider
      </div>
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!apiKey.trim()) return;
          saveKey.mutate({ provider, model: model.trim(), apiKey: apiKey.trim() }, { onSuccess: () => setApiKey("") });
        }}
      >
        <label className="st-field">
          <span>Provider</span>
          <select
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value);
              setModel(byoProvider(e.target.value)?.model ?? model);
            }}
          >
            {BYO_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="st-field">
          <span>Model</span>
          <input value={model} onChange={(e) => setModel(e.target.value)} maxLength={100} autoComplete="off" spellCheck={false} />
        </label>
        <label className="st-field">
          <span>API key {saved ? `(saved, ending ${saved})` : ""}</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={saved ? "Enter a new key to replace it" : "Paste your key"}
            autoComplete="off"
            spellCheck={false}
            maxLength={400}
          />
        </label>
        <small className="text-[12.5px] text-fg-subtle">
          Your key is stored encrypted and only used to answer your own requests. It is never shown again.
        </small>
        <div className="st-actions">
          <button className="btn btn-primary btn-sm" disabled={!apiKey.trim() || !model.trim() || saveKey.isPending}>
            {saved ? "Replace key" : "Save key"}
          </button>
          {saved && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={async () => {
                if (
                  await ask({
                    title: "Remove your API key?",
                    body: "AI stops working on this plan until you add a key again.",
                    confirmLabel: "Remove key",
                    danger: true,
                  })
                )
                  removeKey.mutate();
              }}
            >
              Remove key
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function PlanCard({ plan, current, busy, autopay, onChoose }: { plan: BillingPlan; current: boolean; busy: boolean; autopay: boolean; onChoose: () => void }) {
  return (
    <article
      className="liquid-flat flex flex-col gap-3 rounded-r3 p-[18px] [backdrop-filter:var(--glass-blur)]"
      data-current={current}
      aria-label={plan.name}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="m-0 text-[15px] font-semibold">{plan.name}</h3>
        {current && (
          <span className="rounded-pill bg-fill-dark px-2.5 py-1 text-[11px] font-semibold tracking-[0.06em] text-on-dark uppercase">
            Current
          </span>
        )}
      </div>
      <div className="font-serif font-semibold text-[26px] leading-none tracking-[-0.02em]">{priceLine(plan)}</div>
      <p className="m-0 text-[13.5px] text-fg-muted">{plan.tagline}</p>
      {plan.id === "subscription" && plan.included_tokens > 0 && (
        <p className="m-0 text-[13px] text-fg-subtle">{formatTokens(plan.included_tokens)} AI tokens included each month</p>
      )}
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13.5px]">
            <FA icon={faCheck} className="mt-1 text-[11px] text-green-fg" />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-1">
        <button className={`btn btn-sm ${current ? "btn-secondary" : "btn-primary"}`} disabled={current || busy} onClick={onChoose}>
          {current ? "Your plan" : autopay ? "Subscribe with autopay" : "Choose this plan"}
        </button>
        {autopay && !current && <p className="m-0 mt-2 text-[12.5px] text-fg-subtle">Charged automatically each period by UPI AutoPay or card. Cancel any time.</p>}
      </div>
    </article>
  );
}

function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-pill bg-line" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <i className="block h-full rounded-pill bg-ink" style={{ width: `${value}%` }} />
    </div>
  );
}

/** A small status dot: filled when connected, a ring when not. */
const Dot = ({ on }: { on: boolean }) => <i aria-hidden className={`size-2 rounded-full border ${on ? "border-ink bg-ink" : "border-ink-3"}`} />;

/** Settings → Plan and billing: where you stand, the three plans, your own key, and cancelling. */
export default function BillingPanel() {
  const [err, setErr] = useState("");
  const [topup, setTopup] = useState(false);
  const [connect, setConnect] = useState<null | "chatgpt" | "keys">(null);
  const catalog = useAiCatalog().data;
  const chatgpt = catalog?.groups.find((g) => g.kind === "chatgpt");
  const keyCount = (catalog?.groups ?? []).filter((g) => g.kind === "key" && g.connected).length;
  const q = useBilling();
  const { cancel, resume } = useBillingActions(setErr);
  const { ask, dialog } = useConfirm();
  const b = q.data;
  const { pick, busy: picking } = usePlanPicker(b, setErr);

  if (q.isError)
    return (
      <p className="form-err" role="alert">
        Couldn’t load your plan. Try again in a moment.
      </p>
    );
  if (!b) return <p className="ap-none">Loading your plan…</p>;

  const busy = picking || cancel.isPending || resume.isPending;
  const allowance = b.plan?.id === "subscription" ? b.plan.included_tokens : 0;
  const used = allowance > 0 ? Math.min(100, Math.round((b.tokens_used / allowance) * 100)) : 0;

  return (
    <div className="flex flex-col gap-6">
      {dialog}
      {err && (
        <p className="form-err" role="alert">
          {err}
        </p>
      )}
      {/* The plan you are on, and what it includes: the reference's hero. */}
      <section className="grid grid-cols-2 gap-x-10 border-b pb-8 max-[700px]:grid-cols-1 max-[700px]:gap-y-6" aria-label="Current plan">
        <div>
          <span className="inline-block rounded-xs bg-hover px-2 py-0.5 text-[12.5px] text-ink-2">Current plan</span>
          <h2 className="m-0 mt-3 text-[44px] leading-none font-bold tracking-[-0.03em]">{b.plan ? b.plan.name : "Free"}</h2>
          <p className="m-0 mt-3 text-[15px] text-ink-2">
            <b className="text-[17px] text-ink">{b.plan ? priceLine(b.plan) : "Free"}</b> · {standing(b)}
          </p>
        </div>
        <div className="border-l pl-8 max-[700px]:border-l-0 max-[700px]:pl-0">
          <h3 className="m-0 mb-2 text-[14px] font-medium text-ink-2">Includes</h3>
          <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
            {(b.plan?.features.length ? b.plan.features : ["AI works as it always has until you choose a plan"]).map((f) => (
              <li key={f} className="flex items-start gap-2 py-2 text-[14px]">
                <FA icon={faCheck} className="mt-1 text-[11px] text-green-fg" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex flex-col gap-3.5" aria-label="Usage">
        <h2 className="m-0 text-[15px] font-semibold">Usage</h2>

        {b.plan?.id === "payg" && b.payments_connected ? (
          <div className="rounded-r3 border">
            <div className="grid gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="m-0 text-[14px] text-ink-3">AI balance</p>
                  <p className="m-0 mt-1.5 flex items-baseline gap-2">
                    <b className="text-[34px] leading-none font-semibold tracking-[-0.02em]">{formatBalance(b.credit_cents, b.plan.currency)}</b>
                    <span className="text-[15px] text-ink-3">of {formatBalance(b.credit_total_cents, b.plan.currency)}</span>
                  </p>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setTopup(true)}>
                  Top up
                </button>
              </div>
              <Meter value={b.credit_total_cents > 0 ? Math.round((Math.max(0, b.credit_cents) / b.credit_total_cents) * 100) : 0} label="AI balance left" />
              <p className="m-0 text-[13px] text-ink-3">
                {b.credit_cents > 0 ? "Tokens come off this balance as you use AI." : "AI is paused until you add credit."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t px-5 py-3.5 text-[14px]">
              <span className="text-ink-3">Or pay with</span>
              <span className="flex items-center gap-2">
                <span className="text-ink-2">ChatGPT</span>
                <Dot on={!!chatgpt?.connected} />
                <span>{chatgpt?.connected ? "Connected" : "Not connected"}</span>
                <button type="button" className="cursor-pointer border-b border-line-2 text-ink-2 hover:text-ink" onClick={() => setConnect("chatgpt")}>
                  {chatgpt?.connected ? "Manage" : "Connect"}
                </button>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-ink-2">Your API keys</span>
                <Dot on={keyCount > 0} />
                <span>{keyCount > 0 ? `${keyCount} saved` : "None"}</span>
                <button type="button" className="cursor-pointer border-b border-line-2 text-ink-2 hover:text-ink" onClick={() => setConnect("keys")}>
                  {keyCount > 0 ? "Manage" : "Add a key"}
                </button>
              </span>
            </div>
          </div>
        ) : null}

        <div className="rounded-r3 border p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="m-0 text-[14px] text-ink-3">{allowance > 0 ? "AI allowance" : "AI use this period"}</p>
              <p className="m-0 mt-1.5 flex items-baseline gap-2">
                <b className="text-[30px] leading-none font-semibold tracking-[-0.02em]">{formatTokens(b.tokens_used)}</b>
                <span className="text-[15px] text-ink-3">{allowance > 0 ? `of ${formatTokens(allowance)} tokens` : "tokens"}</span>
              </p>
            </div>
            <span className="text-[13.5px] text-ink-3">
              {b.plan?.id === "payg" && b.cost_cents > 0 ? `About ${formatMoney(b.cost_cents, b.plan.currency)} this period` : b.period_end ? "Resets with your plan" : "This month"}
            </span>
          </div>
          {allowance > 0 && (
            <div className="mt-3">
              <Meter value={used} label="AI allowance used" />
            </div>
          )}
        </div>
      </section>
      {topup && <TopUpDialog billing={b} onClose={() => setTopup(false)} />}
      {connect && <ConnectAiDialog start={connect} onClose={() => setConnect(null)} />}

      {!b.payments_connected && (
        <p className="m-0 rounded-r2 bg-surface-muted px-3.5 py-2.5 text-[13px] text-fg-muted">
          Payments aren’t connected yet, so choosing or changing a plan doesn’t charge you.
        </p>
      )}

      <BillingHistory />

      <h2 className="m-0 mt-2 text-[15px] font-semibold">Plans</h2>
      <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        {b.plans.map((p) => (
          <PlanCard key={p.id} plan={p} current={b.plan?.id === p.id} busy={busy} autopay={needsCheckout(b, p)} onChoose={() => pick(p)} />
        ))}
      </div>

      {b.plan?.id === "byo" && <KeyForm billing={b} onError={setErr} />}

      {b.plan && (
        <div className="st-actions">
          {b.cancel_at_period_end ? (
            <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => resume.mutate()}>
              Keep my plan
            </button>
          ) : (
            <button
              className="btn btn-secondary btn-sm"
              disabled={busy}
              onClick={async () => {
                const ends = b.plan?.id === "subscription" && b.period_end ? `It ends on ${day(b.period_end)}.` : "It stops right away.";
                if (
                  await ask({
                    title: `Cancel ${b.plan?.name}?`,
                    body: `${ends} You can choose a plan again whenever you like.`,
                    confirmLabel: "Cancel plan",
                    danger: true,
                  })
                )
                  cancel.mutate();
              }}
            >
              Cancel plan
            </button>
          )}
        </div>
      )}
    </div>
  );
}
