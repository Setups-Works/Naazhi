import type { BillingInvoice, CheckoutSession, MyBilling, PlanId, TopupSession } from "@untitled/types";
import type { Http } from "./sharedJournals";

/** The plan and billing API, written once for the web and the Expo app. Routes: apps/web/src/app/api/v1/billing. */
type Data<T> = { data: T };
const base = "/api/v1/billing";

export type TopupConfirmInput = { paymentId: string; orderId: string; signature: string };
export type CheckoutConfirmInput = { paymentId: string; subscriptionId: string; signature: string };
export type ByoKeyInput = { provider: string; model: string; apiKey: string };

export function createBillingApi(http: Http) {
  const unwrap = async <T>(p: Promise<Data<T>>) => (await p).data;
  return {
    mine: () => unwrap(http.get<Data<MyBilling>>(base)),
    choosePlan: (planId: PlanId) => unwrap(http.post<Data<MyBilling>>(`${base}/plan`, { planId })),
    /** Starts paying for a plan: what Razorpay's checkout window needs. */
    checkout: (planId: PlanId) => unwrap(http.post<Data<CheckoutSession>>(`${base}/checkout`, { planId })),
    /** The checkout window finished: the server verifies it and activates the plan. */
    confirm: (input: CheckoutConfirmInput) => unwrap(http.post<Data<MyBilling>>(`${base}/confirm`, input)),
    /** Starts adding AI credit (Pay as you go): what Razorpay's checkout needs for a one-time payment. */
    topup: (amountCents: number) => unwrap(http.post<Data<TopupSession>>(`${base}/topup`, { amountCents })),
    /** The payment window finished: the server verifies it and adds the credit. */
    confirmTopup: (input: TopupConfirmInput) => unwrap(http.post<Data<MyBilling>>(`${base}/topup/confirm`, input)),
    /** Billing history: the person's invoices, newest first. */
    invoices: () => unwrap(http.get<Data<BillingInvoice[]>>(`${base}/invoices`)),
    /** A short-lived link that opens one invoice in a browser (the phone has no web sign-in to carry over). */
    invoiceLink: (id: string) => unwrap(http.post<Data<{ url: string }>>(`${base}/invoices/${encodeURIComponent(id)}/link`, {})),
    cancel: () => unwrap(http.post<Data<MyBilling>>(`${base}/cancel`, {})),
    resume: () => unwrap(http.post<Data<MyBilling>>(`${base}/resume`, {})),
    saveKey: (input: ByoKeyInput) => unwrap(http.post<Data<MyBilling>>(`${base}/ai-key`, input)),
    removeKey: () => unwrap(http.delete<Data<MyBilling>>(`${base}/ai-key`)),
  };
}
export type BillingApi = ReturnType<typeof createBillingApi>;
