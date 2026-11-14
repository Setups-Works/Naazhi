import { ogCard, OG_SIZE } from "../../../lib/ogCard";
import { SITE_NAME } from "../../../lib/seo";
import { getPublicMember } from "../../../server/services/team/team.service";

export const alt = "A member of the Naazhi team";
export const size = OG_SIZE;
export const contentType = "image/png";
export const dynamic = "force-dynamic";

/** The share picture for one person's page: their name and role on the site's card. Falls back to the Team card if the person is gone. */
export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const found = await getPublicMember((await params).slug);
  if (!found) return ogCard({ line1: "The people", line2: "behind Naazhi.", sub: "Who builds and cares for it.", chips: ["Team"] });
  const { member: m } = found;
  return ogCard({ line1: m.name, line2: `${m.role}, ${SITE_NAME}.`, sub: "Builds Naazhi at Setups Works.", chips: ["Team"] });
}
