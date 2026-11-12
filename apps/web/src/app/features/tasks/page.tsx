import type { Metadata } from "next";
import FeaturePage from "../../../components/site/FeaturePage";
import { FEATURE_PAGES } from "../../../lib/featurePages";
import { pageMeta } from "../../../lib/seo";

const data = FEATURE_PAGES.tasks;
export const metadata: Metadata = pageMeta({ title: data.seo.title, description: data.seo.description, path: data.path, ownImage: true });

export default function Page() {
  return <FeaturePage data={data} />;
}
