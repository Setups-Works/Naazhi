import type { Metadata } from "next";
import ComparePage from "../../../components/site/ComparePage";
import { COMPARISONS } from "../../../lib/comparisons";
import { pageMeta } from "../../../lib/seo";

const c = COMPARISONS.notion;
export const metadata: Metadata = pageMeta({ title: c.seo.title, description: c.seo.description, path: c.path, ownImage: true });

export default function Page() {
  return <ComparePage c={c} />;
}
