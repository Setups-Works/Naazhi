import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createBillingApi } from "@untitled/api-client";
import { formatMoney, needsCheckout } from "@untitled/logic";
import type { BillingPlan, MyBilling } from "@untitled/types";

import { api, errorMessage } from "@/lib/api";
import { qk } from "@/lib/queryKeys";
import { useBillingActions } from "./queries";

/**
 * Pays for a plan with Razorpay's native checkout (autopay: UPI AutoPay, card, e-mandate). The server creates the subscription and
 * verifies the result exactly as for the web; this only opens the sheet and hands what it returns back. The native module is not in
 * Expo Go, so it is loaded when first needed and a missing module becomes a friendly message instead of a crash.
 */
const billingApi = createBillingApi(api);

type Failure = { code?: number; description?: string };

/** `pick(plan)` for every "Choose this plan" button: opens Razorpay for a paid plan, otherwise switches at once. */
export function usePlanPicker(billing: MyBilling | undefined, onError: (message: string) => void) {
  const qc = useQueryClient();
  const { choose } = useBillingActions(onError);
  const [paying, setPaying] = useState<string | null>(null);

  async function pick(plan: BillingPlan) {
    if (!billing || !needsCheckout(billing, plan)) return choose.mutate(plan.id);
    onError("");
    setPaying(plan.id);
    try {
      const s = await billingApi.checkout(plan.id);
      let sdk: typeof import("react-native-razorpay").default;
      try {
        sdk = (await import("react-native-razorpay")).default;
      } catch {
        throw new Error("Payments need the installed Naazhi app. Update the app, or subscribe on the website.");
      }
      const r = await sdk
        .open({ key: s.key_id, subscription_id: s.subscription_id, name: "Naazhi", description: `${s.name}, ${formatMoney(s.amount, "inr")}`, prefill: s.prefill })
        .catch((e: Failure) => {
          // code 0 on Android and 2 on iOS mean the person closed the sheet; that is not an error.
          if (e?.code === 0 || e?.code === 2) return null;
          throw new Error("That payment didn’t go through. You haven’t been charged. Try again or use another method.");
        });
      if (!r) return;
      const data = await billingApi
        .confirm({ paymentId: r.razorpay_payment_id, subscriptionId: r.razorpay_subscription_id, signature: r.razorpay_signature })
        .catch(() => {
          throw new Error("Your payment went through but we couldn’t confirm it yet. It will appear shortly; contact us if it doesn’t.");
        });
      qc.setQueryData(qk.billing, data);
    } catch (e) {
      onError(e instanceof Error && e.message ? e.message : errorMessage(e));
    } finally {
      setPaying(null);
    }
  }
  return { pick, busy: paying !== null || choose.isPending, loadingId: paying ?? (choose.isPending ? (choose.variables ?? null) : null) };
}
