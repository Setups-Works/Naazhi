import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { currentUser, serverConfigured, userDb } from "../../server/session";
import { CATEGORIES } from "../../lib/notes";
import { cleanPrefs } from "../../lib/prefs";
import { cleanOnboarding } from "../../lib/onboarding";
import QueryProvider from "../../components/providers/QueryProvider";
import PrefsSync from "../../components/app/PrefsSync";
import AcquisitionSync from "../../components/app/AcquisitionSync";
import Onboarding from "../../features/onboarding/Onboarding";

export const metadata: Metadata = { title: "Set up — Naazhi", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * The first-run flow lives at /onboarding/<screen>. This layout stays mounted while the person moves from one screen to the next,
 * so what they typed and chose is kept; each screen is only an address (see the page beside it).
 */
export default async function Layout({ children }: { children: ReactNode }) {
  if (!serverConfigured()) redirect("/dashboard"); // the dashboard explains what is missing
  const user = await currentUser();
  if (!user) redirect("/login?next=/onboarding&stale=1");
  const { data } = await userDb(user.id).from("profiles").select("preferences,onboarding,phone").maybeSingle();
  const prefs = cleanPrefs(data?.preferences, CATEGORIES);
  return (
    <QueryProvider>
      <PrefsSync prefs={prefs} />
      <AcquisitionSync userId={user.id} />
      <Onboarding name={user.name || user.email.split("@")[0]} phone={typeof data?.phone === "string" ? data.phone : ""} prefs={prefs} state={cleanOnboarding(data?.onboarding)} />
      {children}
    </QueryProvider>
  );
}
