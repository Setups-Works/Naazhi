import { NextResponse } from "next/server";
import { serverEnv } from "../../../../../../config/env";
import { ServiceError } from "../../../../../../server/errors";
import { currentUser } from "../../../../../../server/session";
import { finishZohoConnect } from "../../../../../../server/services/integrations/zoho";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Zoho sends the person back here with a one-time code (and the data center they belong to). We finish the sign-in, then return to Settings. */
export async function GET(req: Request) {
  const base = serverEnv().authUrl.replace(/\/+$/, "");
  const back = (result: string, message?: string) => {
    const url = new URL("/dashboard/settings/zoho", base);
    url.searchParams.set("zoho", result);
    if (message) url.searchParams.set("msg", message.slice(0, 200));
    return NextResponse.redirect(url, { headers: { "cache-control": "no-store" } });
  };
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL("/login", base));
  const sp = new URL(req.url).searchParams;
  if (sp.get("error")) return back("error", sp.get("error") === "access_denied" ? "You cancelled the Zoho sign-in." : "Zoho couldn’t sign you in.");
  const code = sp.get("code");
  const state = sp.get("state");
  if (!code || !state) return back("error", "Zoho’s answer was incomplete. Try again.");
  try {
    await finishZohoConnect(user.id, { code, state, accountsServer: sp.get("accounts-server") });
    return back("connected");
  } catch (e) {
    if (e instanceof ServiceError) return back("error", e.message);
    console.error("zoho sign-in failed", e instanceof Error ? e.name : "unknown error");
    return back("error", "Something went wrong connecting Zoho. Try again.");
  }
}
