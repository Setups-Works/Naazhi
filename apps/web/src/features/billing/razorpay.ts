"use client";
import { useState } from "react";
import { createBillingApi } from "@untitled/api-client";
import type { BillingPlan, MyBilling } from "@untitled/types";
import { needsCheckout } from "@untitled/logic/billing";
import { useQueryClient } from "@tanstack/react-query";
import { http, restMessage } from "../../lib/api/rest";
import { qk } from "../../lib/query/keys";
import { useBillingActions } from "./queries";

/**
 * Razorpay's checkout window. The server creates the subscription and checks the result; this only opens the window (the script is
 * loaded from Razorpay when you first pay) and hands what it returns back to the server. The browser never decides a plan is paid.
 */
type CheckoutResult = { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string };
type RazorpayOptions = {
  key: string;
  /** One of the two: a subscription (autopay) or a one-time order (credit top-up). */
  subscription_id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  name: string;
  description: string;
  prefill: { name: string; email: string };
  handler: (r: CheckoutResult & { razorpay_order_id?: string }) => void;
  modal: { ondismiss: () => void };
};
declare global {
  interface Window {
    Razorpay?: new (o: RazorpayOptions) => { open: () => void; on: (e: "payment.failed", cb: () => void) => void };
  }
}

const SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loading: Promise<void> | null = null;
export const loadCheckout = () =>
  (loading ??= new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const el = document.createElement("script");
    el.src = SRC;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      loading = null;
      reject(new Error("checkout script"));
    };
    document.head.appendChild(el);
  }));

const api = createBillingApi(http);

/** `pick(plan)` for every "Choose this plan" button: opens Razorpay for a paid plan, otherwise switches at once. */
export function usePlanPicker(billing: MyBilling | undefined, onError: (m: string) => void) {
  const qc = useQueryClient();
  const { choose } = useBillingActions(onError);
  const [paying, setPaying] = useState(false);

  async function pick(plan: BillingPlan) {
    if (!billing || !needsCheckout(billing, plan)) return choose.mutate(plan.id);
    onError("");
    setPaying(true);
    try {
      const s = await api.checkout(plan.id);
      await loadCheckout();
      if (!window.Razorpay) throw new Error("checkout script");
      const rz = new window.Razorpay({
        key: s.key_id,
        subscription_id: s.subscription_id,
        name: "Naazhi",
        description: `${s.name} (₹${s.amount / 100})`,
        prefill: s.prefill,
        handler: (r) => {
          api
            .confirm({ paymentId: r.razorpay_payment_id, subscriptionId: r.razorpay_subscription_id, signature: r.razorpay_signature })
            .then((data) => {
              qc.setQueryData(qk.billing.me, data);
              void qc.invalidateQueries({ queryKey: qk.billing.invoices });
            })
            .catch((e: unknown) => onError(restMessage(e, "Your payment went through but we couldn’t confirm it yet. It will appear shortly; contact us if it doesn’t.")))
            .finally(() => setPaying(false));
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rz.on("payment.failed", () => onError("That payment didn’t go through. You haven’t been charged. Try again or use another method."));
      rz.open();
    } catch (e) {
      setPaying(false);
      onError(restMessage(e, "Couldn’t open the payment window. Check your connection and try again."));
    }
  }
  return { pick, busy: paying || choose.isPending };
}

/** `topUp(amountCents)`: adds Pay as you go credit with a one-time Razorpay payment. The server creates the order and verifies the result. */
export function useTopUp(onError: (m: string) => void, onDone?: () => void) {
  const qc = useQueryClient();
  const [paying, setPaying] = useState(false);

  async function topUp(amountCents: number) {
    onError("");
    setPaying(true);
    try {
      const s = await api.topup(amountCents);
      await loadCheckout();
      if (!window.Razorpay) throw new Error("checkout script");
      const rz = new window.Razorpay({
        key: s.key_id,
        order_id: s.order_id,
        amount: s.amount,
        currency: s.currency,
        name: s.name,
        description: s.description,
        prefill: s.prefill,
        handler: (r) => {
          api
            .confirmTopup({ paymentId: r.razorpay_payment_id, orderId: r.razorpay_order_id ?? s.order_id, signature: r.razorpay_signature })
            .then((data) => {
              qc.setQueryData(qk.billing.me, data);
              void qc.invalidateQueries({ queryKey: qk.billing.invoices });
              onDone?.();
            })
            .catch((e: unknown) => onError(restMessage(e, "Your payment went through but we couldn’t add the credit yet. It will appear shortly; contact us if it doesn’t.")))
            .finally(() => setPaying(false));
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rz.on("payment.failed", () => onError("That payment didn’t go through. You haven’t been charged. Try again or use another method."));
      rz.open();
    } catch (e) {
      setPaying(false);
      onError(restMessage(e, "Couldn’t open the payment window. Check your connection and try again."));
    }
  }
  return { topUp, busy: paying };
}
