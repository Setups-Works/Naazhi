import { NextResponse } from "next/server";
import { serverEnv } from "../../../../../../config/env";
import { CONNECT_RETURN_COOKIE, readConnectReturn } from "../../../../../../lib/connectReturn";
import { publicPath } from "../../../../../../lib/hosts";
import { ServiceError } from "../../../../../../server/errors";
import { currentUser } from "../../../../../../server/session";
import { finishZohoConnect } from "../../../../../../server/services/integrations/zoho";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Zoho sends the person back here with a one-time code (and the data center they belong to). We finish the sign-in, then return to
 * Settings (or to the onboarding step that started it). The phone's in-app sheet comes back without a session: the secret state from
 * our own database says who started the sign-in.
 */
export async function GET(req: Request) {
  const base = serverEnv().authUrl.replace(/\/+$/, "");
  const returnTo = readConnectReturn(req.headers.get("cookie"));
  const back = (result: string, message?: string) => {
    const url = new URL(publicPath(returnTo ?? "/dashboard/settings/zoho"), base);
    url.searchParams.set("zoho", result);
    if (message) url.searchParams.set("msg", message.slice(0, 200));
    const res = NextResponse.redirect(url, { headers: { "cache-control": "no-store" } });
    if (returnTo) res.cookies.set(CONNECT_RETURN_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  };
  const user = await currentUser();
  const sp = new URL(req.url).searchParams;
  const code = sp.get("code");
  const state = sp.get("state");
  // Errors also go back to the Settings address: the phone's sheet closes on it, and a signed-out browser is sent to sign in from there.
  if (sp.get("error")) return back("error", sp.get("error") === "access_denied" ? "You cancelled the Zoho sign-in." : "Zoho couldn’t sign you in.");
  if (!code || !state) return back("error", "Zoho’s answer was incomplete. Try again.");
  try {
    await finishZohoConnect(user?.id ?? null, { code, state, accountsServer: sp.get("accounts-server") });
    return back("connected");
  } catch (e) {
    if (e instanceof ServiceError) return back("error", e.message);
    console.error("zoho sign-in failed", e instanceof Error ? e.name : "unknown error");
    return back("error", "Something went wrong connecting Zoho. Try again.");
  }
}
