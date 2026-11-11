import { serverConfigured } from "../../../server/session";
import { adminListInvoices } from "../../../server/services/billing/invoices.service";
import SetupNotice from "../../../components/admin/SetupNotice";
import InvoicesTable from "../../../components/admin/InvoicesTable";

export const dynamic = "force-dynamic";

/** Invoices across everyone: find one by email or number and refund it. Amounts and who they were billed to only, never anything a person wrote. */
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  if (!serverConfigured()) return <SetupNotice />;
  const q = (await searchParams).q ?? "";
  const rows = await adminListInvoices(q).catch(() => null);
  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <div className="eyebrow">Invoices</div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            Invoices and refunds
          </h1>
          <p className="meta">
            Every payment taken, newest first. A refund goes back through Razorpay to the original payment method. A credit top-up can only be
            refunded up to what is still unspent in the person’s balance.
          </p>
        </div>
      </div>
      {rows ? (
        <InvoicesTable rows={rows} query={q} />
      ) : (
        <p className="form-err" role="alert">
          Couldn’t load invoices. Make sure the latest database migration has been applied.
        </p>
      )}
    </div>
  );
}
