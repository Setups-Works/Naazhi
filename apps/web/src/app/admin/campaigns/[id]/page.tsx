import Link from "next/link";
import { notFound } from "next/navigation";
import { listAllUsers, serverConfigured } from "../../../../server/session";
import SetupNotice from "../../../../components/admin/SetupNotice";
import CampaignEditor from "../../../../components/admin/CampaignEditor";
import { getCampaign, listAttachments, newsletterAudienceSize } from "../../../../server/repositories/campaigns.repository";
import { previewCampaign } from "../actions";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!serverConfigured()) return <SetupNotice />;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const campaign = await getCampaign(id);
  if (!campaign) notFound();
  if (campaign.status !== "draft") {
    // A sent campaign is read-only: its text as it went out.
    const r = await previewCampaign({ html: campaign.html, preheader: campaign.preheader, kind: campaign.kind });
    return (
      <div className="dash">
        <div className="dash-head">
          <div>
            <div className="eyebrow">
              <Link href="/admin/campaigns">Campaigns</Link>
            </div>
            <h1 className="h2" style={{ marginTop: 8 }}>
              {campaign.subject}
            </h1>
            <p className="meta">This campaign is {campaign.status === "sending" ? "still sending" : campaign.status}; it can’t be edited.</p>
          </div>
        </div>
        {r.ok && <iframe title="Email as sent" sandbox="" srcDoc={r.html} className="h-[640px] w-full rounded-r3 border bg-paper" />}
      </div>
    );
  }
  const [users, audienceSize, attachments] = await Promise.all([listAllUsers(), newsletterAudienceSize(), listAttachments(id)]);
  const people = users.filter((u) => !u.banned).map((u) => ({ id: u.id, email: u.email, name: u.name || "" })).sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <div className="eyebrow">
            <Link href="/admin/campaigns">Campaigns</Link>
          </div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            Edit campaign
          </h1>
        </div>
      </div>
      <CampaignEditor
        id={id}
        initial={{ subject: campaign.subject, preheader: campaign.preheader, html: campaign.html, kind: campaign.kind, audience: campaign.audience, picked: campaign.picked }}
        people={people}
        audienceSize={audienceSize}
        attachments={attachments.map((a) => ({ id: a.id, name: a.name, sizeBytes: a.sizeBytes }))}
      />
    </div>
  );
}
