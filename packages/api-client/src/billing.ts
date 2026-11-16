import type { BillingInvoice, CheckoutSession, MyBilling, PlanId, TopupSession } from "@untitled/types";
import type { Http } from "./sharedJournals";

/** The plan and billing API, written once for the web and the Expo app. Routes: apps/web/src/app/api/v1/billing. */
type Data<T> = { data: T };
const base = "/api/v1/billing";

export type TopupConfirmInput = { paymentId: string; orderId: string; signature: string };
export type CheckoutConfirmInput = { paymentId: string; subscriptionId: string; signature: string };
/** Where Stripe's hosted page sends the person back to, and the session it was for. */
export type StripeConfirmInput = { sessionId: string } | { subscriptionId: string } | { paymentIntentId: string };
export type ByoKeyInput = { provider: string; model: string; apiKey: string };

export function createBillingApi(http: Http) {
  const unwrap = async <T>(p: Promise<Data<T>>) => (await p).data;
  return {
    mine: () => unwrap(http.get<Data<MyBilling>>(base)),
    choosePlan: (planId: PlanId) => unwrap(http.post<Data<MyBilling>>(`${base}/plan`, { planId })),
    /** Starts paying for a plan: Razorpay's window details (India) or a Stripe page to go to (everyone else). */
    checkout: (planId: PlanId, client: "web" | "app" = "web") => unwrap(http.post<Data<CheckoutSession>>(`${base}/checkout`, { planId, client })),
    /** The checkout window finished: the server verifies it and activates the plan. */
    confirm: (input: CheckoutConfirmInput) => unwrap(http.post<Data<MyBilling>>(`${base}/confirm`, input)),
    /** Starts adding AI credit (Pay as you go): what Razorpay's checkout needs for a one-time payment. */
    topup: (amountCents: number, client: "web" | "app" = "web") => unwrap(http.post<Data<TopupSession>>(`${base}/topup`, { amountCents, client })),
    /** The payment window finished: the server verifies it and adds the credit. */
    confirmTopup: (input: TopupConfirmInput) => unwrap(http.post<Data<MyBilling>>(`${base}/topup/confirm`, input)),
    /** Billing history: the person's invoices, newest first. */
    invoices: () => unwrap(http.get<Data<BillingInvoice[]>>(`${base}/invoices`)),
    /** A short-lived link that opens one invoice in a browser (the phone has no web sign-in to carry over). */
    invoiceLink: (id: string) => unwrap(http.post<Data<{ url: string }>>(`${base}/invoices/${encodeURIComponent(id)}/link`, {})),
    /** Back from Stripe's page: the server asks Stripe what happened (nothing in the address is trusted) and applies it. */
    confirmStripe: (input: StripeConfirmInput) => unwrap(http.post<Data<MyBilling>>(`${base}/stripe/confirm`, input)),
    /** Saves the person's country. Refused (with the reason) while a paid subscription or credit in the current currency would be stranded. */
    setCountry: (country: string) => unwrap(http.post<Data<MyBilling>>(`${base}/country`, { country })),
    cancel: () => unwrap(http.post<Data<MyBilling>>(`${base}/cancel`, {})),
    resume: () => unwrap(http.post<Data<MyBilling>>(`${base}/resume`, {})),
    saveKey: (input: ByoKeyInput) => unwrap(http.post<Data<MyBilling>>(`${base}/ai-key`, input)),
    removeKey: () => unwrap(http.delete<Data<MyBilling>>(`${base}/ai-key`)),
  };
}
export type BillingApi = ReturnType<typeof createBillingApi>;
