import Link from "next/link";
import { listAllUsers, serverConfigured } from "../../../../server/session";
import SetupNotice from "../../../../components/admin/SetupNotice";
import CampaignEditor from "../../../../components/admin/CampaignEditor";
import { newsletterAudienceSize } from "../../../../server/repositories/campaigns.repository";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!serverConfigured()) return <SetupNotice />;
  const [users, audienceSize] = await Promise.all([listAllUsers(), newsletterAudienceSize()]);
  const people = users.filter((u) => !u.banned).map((u) => ({ id: u.id, email: u.email, name: u.name || "" })).sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <div className="eyebrow">
            <Link href="/admin/campaigns">Campaigns</Link>
          </div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            New campaign
          </h1>
        </div>
      </div>
      <CampaignEditor id={null} initial={{ subject: "", preheader: "", html: "", kind: "newsletter", audience: "all", picked: [] }} people={people} audienceSize={audienceSize} attachments={[]} />
    </div>
  );
}
