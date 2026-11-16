"use client";
import { track } from "../../lib/analytics";
import { createBillingApi, type ByoKeyInput } from "@untitled/api-client";
import type { MyBilling, PlanId } from "@untitled/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { http, restMessage } from "../../lib/api/rest";
import { qk } from "../../lib/query/keys";

/** Data layer for Settings → Plan and billing. The calls are shared with the phone app (packages/api-client). */
const billingApi = createBillingApi(http);

export const useBilling = () => useQuery({ queryKey: qk.billing.me, queryFn: billingApi.mine });

/** Billing history: every invoice, newest first. */
export const useInvoices = () => useQuery({ queryKey: qk.billing.invoices, queryFn: billingApi.invoices });

/** Every change answers with the fresh billing state, which replaces the cache so the screen updates at once. */
export function useBillingActions(onError: (message: string) => void) {
  const qc = useQueryClient();
  const settle = {
    onSuccess: (data: MyBilling) => qc.setQueryData(qk.billing.me, data),
    onError: (e: unknown) => onError(restMessage(e, "Couldn’t update your plan.")),
  };
  const choose = useMutation({
    mutationFn: (planId: PlanId) => billingApi.choosePlan(planId),
    ...settle,
    onSuccess: (data: MyBilling, planId: PlanId) => {
      settle.onSuccess(data);
      void track("select_plan", { plan: planId });
    },
  });
  const cancel = useMutation({ mutationFn: () => billingApi.cancel(), ...settle });
  const resume = useMutation({ mutationFn: () => billingApi.resume(), ...settle });
  const saveKey = useMutation({ mutationFn: (input: ByoKeyInput) => billingApi.saveKey(input), ...settle });
  const removeKey = useMutation({ mutationFn: () => billingApi.removeKey(), ...settle });
  const country = useMutation({ mutationFn: (code: string) => billingApi.setCountry(code), ...settle, onError: (e: unknown) => onError(restMessage(e, "Couldn’t save your country.")) });
  return { choose, cancel, resume, saveKey, removeKey, country };
}

/**
 * Back from Stripe's page (`?stripe=success&session_id=…` on the billing settings): asks the server to check the payment with Stripe and
 * apply it, then removes the parameters so a refresh doesn't repeat it. A cancelled trip just tidies the address.
 */
export function useStripeReturn(onError: (message: string) => void) {
  const qc = useQueryClient();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    const q = new URLSearchParams(window.location.search);
    const outcome = q.get("stripe");
    if (!outcome) return;
    done.current = true;
    const clean = () => window.history.replaceState(null, "", window.location.pathname);
    const session = q.get("session_id");
    if (outcome !== "success" || !session) return clean();
    billingApi
      .confirmStripe({ sessionId: session })
      .then((data) => {
        qc.setQueryData(qk.billing.me, data);
        void qc.invalidateQueries({ queryKey: qk.billing.invoices });
      })
      .catch((e: unknown) => onError(restMessage(e, "Your payment may have gone through but we couldn’t confirm it yet. It will appear shortly; contact us if it doesn’t.")))
      .finally(clean);
  }, [onError, qc]);
}
