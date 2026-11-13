import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "../../server/session";
import DesktopSignIn from "../../components/auth/DesktopSignIn";

export const metadata: Metadata = { title: "Open Naazhi — Naazhi", robots: { index: false } };
export const dynamic = "force-dynamic";

/** The browser half of signing in to the desktop app: sign in as usual, then hand the app a single-use token (see docs/DESKTOP.md). */
export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/desktop-signin");
  return (
    <main className="grid min-h-svh place-items-center px-4">
      <DesktopSignIn email={user.email} />
    </main>
  );
}
