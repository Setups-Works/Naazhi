import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { appLink } from "../../../server/services/billing/invoices.service";

export const metadata: Metadata = { title: "Back to Naazhi", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Where Stripe's payment page sends people afterwards. Nothing here is trusted or acted on: it only passes the (shape-checked) session
 * id along to the place that asks Stripe what happened: the website's billing settings, or, from the phone app, the app itself.
 * The phone opens Stripe in its in-app browser and watches for the app's own address, so that is where an app payment is sent back to.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string; session_id?: string; app?: string }> }) {
  const q = await searchParams;
  const status = q.status === "success" ? "success" : "cancel";
  const session = typeof q.session_id === "string" && /^cs_[A-Za-z0-9_]+$/.test(q.session_id) ? q.session_id : null;
  const query = `status=${status}${status === "success" && session ? `&session_id=${session}` : ""}`;
  if (q.app === "1") redirect(`untitled://billing-return?${query}`);
  redirect(`${appLink("/dashboard/settings/billing")}?stripe=${status}${status === "success" && session ? `&session_id=${session}` : ""}`);
}
