import type { Metadata } from "next";
import type { ReactNode } from "react";
import { accountInfo, requireAdmin, serverConfigured, userDb } from "../../server/session";
import { CATEGORIES } from "../../lib/notes";
import { cleanPrefs } from "../../lib/prefs";
import AppNav from "../../components/app/AppNav";
import { SettingsDataProvider } from "../../components/app/SettingsData";
import QueryProvider from "../../components/providers/QueryProvider";

export const metadata: Metadata = { title: "Admin — Naazhi", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** The admin panel runs inside the same shell as the app (the sidebar, breadcrumb and look), with the admin sections in the sidebar. */
export default async function Layout({ children }: { children: ReactNode }) {
  if (!serverConfigured())
    return (
      <main className="section">
        <div className="container" style={{ maxWidth: 640 }}>
          <div className="panel">
            <p className="body">
              We can’t reach the server right now. Please try again in a moment.
            </p>
          </div>
        </div>
      </main>
    );
  const user = await requireAdmin();
  const [profile, info] = await Promise.all([userDb(user.id).from("profiles").select("preferences,phone").maybeSingle(), accountInfo(user.id)]);
  const prefs = cleanPrefs(profile.data?.preferences, CATEGORIES);
  const account = {
    name: user.name,
    email: user.email,
    username: user.username ?? null,
    displayUsername: user.displayUsername ?? null,
    hasPassword: info.providers.includes("email"),
    providers: info.providers,
    createdAt: user.createdAt,
    avatarUrl: user.image,
    lastSignIn: info.lastSignIn,
    phone: typeof profile.data?.phone === "string" ? profile.data.phone : "",
  };
  return (
    <QueryProvider>
      <SettingsDataProvider value={{ account, prefs }}>
        <div className="ap">
          <AppNav name={user.name || user.email.split("@")[0]} email={user.email} admin prefs={prefs} account={account} />
          <div className="ap-body">{children}</div>
        </div>
      </SettingsDataProvider>
    </QueryProvider>
  );
}
