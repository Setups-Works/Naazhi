import { notFound } from "next/navigation";
import { tabFromSlug } from "../../../../features/settings/tabs";
import SettingsPage from "../../../../components/app/SettingsPage";

export const metadata = { title: "Settings — Naazhi" };

/** /dashboard/settings/<section>: Settings as an ordinary page. The bare address shows the grid of sections. */
export default async function Page({ params }: { params: Promise<{ tab?: string[] }> }) {
  const { tab } = await params;
  if (!tab?.length) return <SettingsPage tab="home" />;
  const section = tab.length === 1 ? tabFromSlug(tab[0]) : null;
  if (!section) notFound();
  return <SettingsPage tab={section} />;
}
