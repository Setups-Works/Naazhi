import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { createBillingApi } from "@untitled/api-client";
import { formatMoney, needsCheckout } from "@untitled/logic";
import type { BillingPlan, MyBilling } from "@untitled/types";

import { api, errorMessage } from "@/lib/api";
import { mobileEnv } from "@/config/env";
import { paletteFor } from "@/constants/theme";
import { qk } from "@/lib/queryKeys";
import { useBillingActions } from "./queries";

/**
 * Pays for a plan with Razorpay's native checkout (autopay: UPI AutoPay, card, e-mandate). The server creates the subscription and
 * verifies the result exactly as for the web; this only opens the sheet and hands what it returns back. The native module is not in
 * Expo Go, so it is loaded when first needed and a missing module becomes a friendly message instead of a crash.
 */
const billingApi = createBillingApi(api);

/** Naazhi's name, logo and green inside Razorpay's payment sheet (always the light-scheme brand colour, whatever the phone shows). */
const brand = () => ({
  name: "Naazhi",
  theme: { color: paletteFor(false).brand },
  ...(mobileEnv.apiBaseUrl ? { image: `${mobileEnv.apiBaseUrl}/brand/icon-512.png` } : {}),
});

type Failure = { code?: number; description?: string };

/** Where the website sends the phone back to after Stripe's page (`/billing/return?app=1`); the in-app browser watches for it and closes. */
const STRIPE_RETURN = "untitled://billing-return";

/**
 * Outside India the payment happens on Stripe's own page, opened in the phone's in-app browser. Returns the Stripe session id when the
 * page sent the person back as paid, or null when they closed it or cancelled. The id is only a hint: the server asks Stripe itself.
 */
async function payOnStripe(url: string): Promise<string | null> {
  const r = await WebBrowser.openAuthSessionAsync(url, STRIPE_RETURN);
  if (r.type !== "success") return null;
  return /[?&]session_id=(cs_[A-Za-z0-9_]+)/.exec(r.url)?.[1] ?? null;
}

type Sheet = NonNullable<Extract<Awaited<ReturnType<typeof billingApi.checkout>>, { sheet: object }>["sheet"]>;

/**
 * Stripe's native payment sheet (card, Apple Pay / Google Pay, saved cards) when the server offers it. Resolves true when the person paid
 * (or saved their card for a free trial), false when they closed the sheet. The native module is not in Expo Go, so it is loaded when
 * first needed and a missing module becomes a friendly message instead of a crash.
 */
async function payInSheet(sheet: Sheet): Promise<boolean> {
  let sdk: typeof import("@stripe/stripe-react-native");
  try {
    sdk = await import("@stripe/stripe-react-native");
  } catch {
    throw new Error("Payments need the installed Naazhi app. Update the app, or pay on the website.");
  }
  await sdk.initStripe({ publishableKey: sheet.publishable_key, urlScheme: "untitled" });
  const init = await sdk.initPaymentSheet({
    merchantDisplayName: "Naazhi",
    customerId: sheet.customer_id,
    customerSessionClientSecret: sheet.customer_session_secret,
    ...(sheet.intent === "setup" ? { setupIntentClientSecret: sheet.client_secret } : { paymentIntentClientSecret: sheet.client_secret }),
    returnURL: STRIPE_RETURN,
    allowsDelayedPaymentMethods: false,
    primaryButtonLabel: sheet.intent === "setup" ? "Start free trial" : `Pay ${formatMoney(sheet.amount, "usd")}`,
    appearance: { colors: { primary: paletteFor(false).brand } },
  });
  if (init.error) throw new Error("Couldn’t open the payment sheet. You haven’t been charged. Try again in a moment.");
  const res = await sdk.presentPaymentSheet();
  if (res.error) {
    if (res.error.code === sdk.PaymentSheetError.Canceled) return false;
    throw new Error("That payment didn’t go through. You haven’t been charged. Try again or use another card.");
  }
  return true;
}

const STRIPE_UNCONFIRMED = "Your payment may have gone through but we couldn’t confirm it yet. It will appear shortly; contact us if it doesn’t.";

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
      const s = await billingApi.checkout(plan.id, "app");
      if (s.provider === "stripe" && s.sheet) {
        const paid = await payInSheet(s.sheet);
        if (!paid) return void (await qc.invalidateQueries({ queryKey: qk.billing }));
        qc.setQueryData(qk.billing, await billingApi.confirmStripe({ subscriptionId: s.sheet.reference_id }).catch(() => { throw new Error(STRIPE_UNCONFIRMED); }));
        return;
      }
      if (s.provider === "stripe") {
        const sessionId = await payOnStripe(s.url);
        // Closed without paying: just refresh in case the webhook already applied it.
        if (!sessionId) return void (await qc.invalidateQueries({ queryKey: qk.billing }));
        qc.setQueryData(qk.billing, await billingApi.confirmStripe({ sessionId }).catch(() => { throw new Error(STRIPE_UNCONFIRMED); }));
        return;
      }
      let sdk: typeof import("react-native-razorpay").default;
      try {
        sdk = (await import("react-native-razorpay")).default;
      } catch {
        throw new Error("Payments need the installed Naazhi app. Update the app, or subscribe on the website.");
      }
      const r = await sdk
        .open({ key: s.key_id, subscription_id: s.subscription_id, ...brand(), description: s.trial_days > 0 ? `${s.name}: ${s.trial_days} days free, then ${formatMoney(s.amount, "inr")} / month` : `${s.name}, ${formatMoney(s.amount, "inr")}`, prefill: s.prefill })
        .catch((e: Failure) => {
          // code 0 on Android and 2 on iOS mean the person closed the sheet; that is not an error.
          if (e?.code === 0 || e?.code === 2) return null;
          throw new Error("That payment didn’t go through. You haven’t been charged. Try again or use another method.");
        });
      if (!r) return;
      const data = await billingApi
        .confirm({ paymentId: r.razorpay_payment_id, subscriptionId: r.razorpay_subscription_id ?? s.subscription_id, signature: r.razorpay_signature })
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

/** `topUp(amountCents)`: adds Pay as you go credit with a one-time Razorpay payment (the server creates the order and verifies the result). */
export function useTopUp(onError: (message: string) => void) {
  const qc = useQueryClient();
  const [paying, setPaying] = useState(false);

  async function topUp(amountCents: number) {
    onError("");
    setPaying(true);
    try {
      const s = await billingApi.topup(amountCents, "app");
      if (s.provider === "stripe" && s.sheet) {
        const paid = await payInSheet(s.sheet);
        if (!paid) return void (await qc.invalidateQueries({ queryKey: qk.billing }));
        qc.setQueryData(qk.billing, await billingApi.confirmStripe({ paymentIntentId: s.sheet.reference_id }).catch(() => { throw new Error(STRIPE_UNCONFIRMED); }));
        return;
      }
      if (s.provider === "stripe") {
        const sessionId = await payOnStripe(s.url);
        if (!sessionId) return void (await qc.invalidateQueries({ queryKey: qk.billing }));
        qc.setQueryData(qk.billing, await billingApi.confirmStripe({ sessionId }).catch(() => { throw new Error(STRIPE_UNCONFIRMED); }));
        return;
      }
      let sdk: typeof import("react-native-razorpay").default;
      try {
        sdk = (await import("react-native-razorpay")).default;
      } catch {
        throw new Error("Payments need the installed Naazhi app. Update the app, or add credit on the website.");
      }
      const r = await sdk
        .open({ key: s.key_id, order_id: s.order_id, amount: s.amount, currency: s.currency, ...brand(), description: s.description, prefill: s.prefill })
        .catch((e: Failure) => {
          if (e?.code === 0 || e?.code === 2) return null;
          throw new Error("That payment didn’t go through. You haven’t been charged. Try again or use another method.");
        });
      if (!r) return;
      const data = await billingApi
        .confirmTopup({ paymentId: r.razorpay_payment_id, orderId: r.razorpay_order_id ?? s.order_id, signature: r.razorpay_signature })
        .catch(() => {
          throw new Error("Your payment went through but we couldn’t add the credit yet. It will appear shortly; contact us if it doesn’t.");
        });
      qc.setQueryData(qk.billing, data);
    } catch (e) {
      onError(e instanceof Error && e.message ? e.message : errorMessage(e));
    } finally {
      setPaying(false);
    }
  }
  return { topUp, busy: paying };
}
