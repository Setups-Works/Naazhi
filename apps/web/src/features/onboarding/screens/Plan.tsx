"use client";
import { Icon as FA } from "@/components/ui/Icon";
import { faArrowRight, faCheck } from "@fortawesome/free-solid-svg-icons";
import { needsCheckout, priceLine } from "@untitled/logic/billing";
import { cn } from "@/lib/cn";
import { useBilling } from "../../billing/queries";
import { usePlanPicker } from "../../billing/razorpay";
import { Card, Title, Lead, type Ctx } from "../ui";

/**
 * The last choice: how AI is paid for. These are the plans from Settings → Plan and billing (set up in Admin → Plans), chosen the same
 * way. Payments aren't connected yet, so a choice is recorded and nobody is charged, and the screen says that.
 */
export function PlanScreen({ ctx }: { ctx: Ctx }) {
  const billing = useBilling();
  const b = billing.data;
  const { pick, busy } = usePlanPicker(b, (m) => ctx.setErr(m));
  const plans = (b?.plans ?? []).filter((p) => p.active).sort((a, c) => a.sort - c.sort);
  const chosen = b?.plan?.id ?? null;

  return (
    <div className="mx-auto w-full max-w-[1000px] px-6 py-8">
      <div className="mx-auto max-w-[680px] text-center">
        <Title>Naazhi already knows you. Keep it your way.</Title>
        <Lead className="mx-auto">Your notes, tasks and journal stay yours on any plan. A plan only decides how Naazhi’s AI is paid for, and you can switch whenever you like.</Lead>
      </div>

      {billing.isPending ? (
        <p className="mt-10 text-center text-[15px] text-fg-subtle">Loading plans…</p>
      ) : billing.isError || plans.length === 0 ? (
        <Card className="mx-auto mt-10 max-w-[560px] px-5 py-4 text-center text-[15px] text-fg-muted">
          Plans aren’t available right now. You can choose one later in Settings → Plan and billing.
        </Card>
      ) : (
        <ul className="m-0 mt-6 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
          {plans.map((p) => {
            const mine = chosen === p.id;
            return (
              <li key={p.id} className="flex">
                <Card className={cn("flex w-full flex-col p-5", mine && "border-fg")}>
                  <div className="flex items-center justify-between gap-3">
                    <b className="text-[18px] font-semibold text-fg">{p.name}</b>
                    {mine && <span className="rounded-pill bg-hover px-2.5 py-0.5 text-[12.5px] font-medium text-ink-2">Your plan</span>}
                  </div>
                  <p className="m-0 mt-1 text-[14.5px] text-fg-muted">{p.tagline}</p>
                  <p className="m-0 mt-3 font-serif text-[24px] font-semibold tracking-[-0.02em] text-fg">{priceLine(p)}</p>
                  <ul className="m-0 mt-4 grid flex-1 list-none content-start gap-2 p-0">
                    {p.features.slice(0, 4).map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[14.5px] text-fg-muted">
                        <FA icon={faCheck} className="mt-1 text-[12px] text-fg" /> <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className={cn("btn mt-5", mine ? "btn-secondary" : "btn-primary")}
                    disabled={mine || busy}
                    onClick={() => {
                      ctx.setErr("");
                      void pick(p);
                    }}
                  >
                    {mine ? "Chosen" : b && needsCheckout(b, p) ? "Subscribe with autopay" : `Choose ${p.name}`}
                  </button>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {b && !b.payments_connected && (
        <p className="m-0 mt-4 text-center text-[14px] text-fg-subtle">Payments aren’t connected yet, so choosing a plan is recorded and nobody is charged.</p>
      )}
      {ctx.err && (
        <p className="form-err text-center" role="alert">
          {ctx.err}
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <button type="button" className="btn btn-secondary" onClick={ctx.back}>
          Back
        </button>
        <button type="button" className="btn btn-primary" onClick={ctx.next}>
          {chosen ? "Finish setup" : "Continue without a plan"} <FA icon={faArrowRight} />
        </button>
      </div>
    </div>
  );
}
