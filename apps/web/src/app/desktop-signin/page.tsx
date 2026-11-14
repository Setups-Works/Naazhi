import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "../../server/session";
import DesktopAuthorize from "../../components/auth/DesktopAuthorize";
import DesktopSignIn from "../../components/auth/DesktopSignIn";

export const metadata: Metadata = { title: "Open Naazhi — Naazhi", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * The browser half of signing in to the desktop app: sign in as usual, then authorize the code the app shows (see docs/DESKTOP.md).
 * Without a code (an older desktop app) it falls back to handing the app a single-use token through a naazhi:// link.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const raw = (await searchParams).code?.trim().toUpperCase() ?? "";
  const code = /^[A-HJ-NP-Z2-9]{6}$/.test(raw) ? raw : null;
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(code ? `/desktop-signin?code=${code}` : "/desktop-signin")}`);
  return (
    <main className="grid min-h-svh place-items-center px-4">{code ? <DesktopAuthorize email={user.email} code={code} /> : <DesktopSignIn email={user.email} />}</main>
  );
}
