import Link from "next/link";
import { serverConfigured } from "../../../server/session";
import SetupNotice from "../../../components/admin/SetupNotice";
import CampaignsTable from "../../../components/admin/CampaignsTable";
import { listCampaigns, newsletterAudienceSize, unsubscribedCount } from "../../../server/repositories/campaigns.repository";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!serverConfigured()) return <SetupNotice />;
  const [rows, audience, out] = await Promise.all([listCampaigns(), newsletterAudienceSize(), unsubscribedCount()]);
  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <div className="eyebrow">Campaigns</div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            Newsletters and emails
          </h1>
          <p className="meta">
            {audience} people would get a newsletter now; {out} unsubscribed.
          </p>
        </div>
        <Link className="btn btn-primary btn-sm" href="/admin/campaigns/new">
          New campaign
        </Link>
      </div>
      <CampaignsTable rows={rows} />
    </div>
  );
}
