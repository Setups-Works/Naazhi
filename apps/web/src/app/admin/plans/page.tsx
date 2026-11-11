import { serverConfigured } from "../../../server/session";
import { adminOverview, paymentsLive } from "../../../server/services/billing/billing.service";
import { formatTokens } from "@untitled/logic/billing";
import SetupNotice from "../../../components/admin/SetupNotice";
import PlansEditor from "../../../components/admin/PlansEditor";
import SubscribersTable from "../../../components/admin/SubscribersTable";
import CreditSettings from "../../../components/admin/CreditSettings";
import InvoiceSettings from "../../../components/admin/InvoiceSettings";

export const dynamic = "force-dynamic";

const TONES = ["violet", "blue", "amber", "mint", "clay"];

export default async function Page() {
  if (!serverConfigured()) return <SetupNotice />;
  const { plans, totals, subscribers, tokens30d, limits, razorpayStatus, seller } = await adminOverview().catch(() => ({
    plans: null,
    totals: [],
    subscribers: [],
    tokens30d: 0,
    limits: null,
    razorpayStatus: null,
    seller: null,
  }));
  if (!plans || !limits || !razorpayStatus || !seller)
    return (
      <div className="dash">
        <p className="form-err" role="alert">
          Couldn’t load plans. Make sure the latest database migration has been applied.
        </p>
      </div>
    );
  const people = (id: string) => totals.find((t) => t.plan_id === id)?.active ?? 0;

  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <div className="eyebrow">Plans</div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            Prices, allowances and subscribers
          </h1>
          <p className="meta">
            Edit what each plan costs and includes. The pricing page and Settings read these rows, so a change shows everywhere at once.
            {paymentsLive() ? "Subscriptions are charged through Razorpay autopay, in rupees." : "Nobody is charged yet: Razorpay isn’t connected."}
          </p>
        </div>
      </div>
      <div className="dash-stats adm-six">
        {plans.map((p, i) => (
          <div className={`dash-stat at-${TONES[i % TONES.length]}`} key={p.id}>
            <b>{people(p.id)}</b>
            <small>{p.name}</small>
          </div>
        ))}
        <div className="dash-stat">
          <b>{formatTokens(tokens30d)}</b>
          <small>Tokens, last 30 days</small>
        </div>
      </div>
      <section className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-r3 border bg-paper px-5 py-3.5 text-[14px]" aria-label="Payments">
        <b className="font-semibold">Razorpay</b>
        <span>{razorpayStatus.live ? `Live${razorpayStatus.mode ? ` (${razorpayStatus.mode} keys)` : ""}` : "Not connected"}</span>
        <span className="text-fg-muted">API keys: {razorpayStatus.keys ? "set" : "missing"}</span>
        <span className="text-fg-muted">Webhook secret: {razorpayStatus.webhook ? "set" : "missing"}</span>
        {!razorpayStatus.live && <span className="text-fg-subtle">Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET to take payments.</span>}
      </section>
      <PlansEditor plans={plans} />
      <h2 className="h3" style={{ margin: "28px 0 12px" }}>
        AI credit (Pay as you go)
      </h2>
      <CreditSettings limits={limits} />
      <h2 className="h3" style={{ margin: "28px 0 12px" }}>
        Invoice details
      </h2>
      <InvoiceSettings seller={seller} />
      <h2 className="h3" style={{ margin: "28px 0 12px" }}>
        Subscribers
      </h2>
      <SubscribersTable rows={subscribers} plans={plans} />
    </div>
  );
}
