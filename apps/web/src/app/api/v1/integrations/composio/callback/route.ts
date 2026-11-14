import { NextResponse } from "next/server";
import { serverEnv } from "../../../../../../config/env";
import { CONNECT_RETURN_COOKIE, readConnectReturn } from "../../../../../../lib/connectReturn";
import { publicPath } from "../../../../../../lib/hosts";
import { ServiceError } from "../../../../../../server/errors";
import { currentUser } from "../../../../../../server/session";
import { finishGoogleConnect } from "../../../../../../server/services/composio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Google sends the person back here after the approval page (`?code=…&state=…`). The state ties the visit to the person who started
 * it and works once; the code is exchanged for tokens on the server. Then the person returns to Settings.
 */
export async function GET(req: Request) {
  const base = serverEnv().authUrl.replace(/\/+$/, "");
  const returnTo = readConnectReturn(req.headers.get("cookie"));
  const sp = new URL(req.url).searchParams;
  const back = (result: "connected" | "error", message?: string) => {
    const url = new URL(returnTo ?? publicPath("/dashboard/settings/google"), base);
    url.searchParams.set("composio", result);
    if (message) url.searchParams.set("msg", message.slice(0, 200));
    const res = NextResponse.redirect(url, { headers: { "cache-control": "no-store" } });
    if (returnTo) res.cookies.set(CONNECT_RETURN_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  };
  const user = await currentUser();
  const code = sp.get("code");
  const state = sp.get("state");
  if (sp.get("error") || !code || !state) return user ? back("error", "The sign-in didn’t finish. Try again.") : NextResponse.redirect(new URL("/login", base));
  try {
    // No session (the phone's in-app sheet): the secret state from our own database says who started this sign-in.
    await finishGoogleConnect(user?.id ?? null, { code, state });
    return back("connected");
  } catch (e) {
    if (e instanceof ServiceError) return back("error", e.message);
    console.error("google sign-in failed", e instanceof Error ? e.name : "unknown error");
    return back("error", "Something went wrong connecting Google. Try again.");
  }
}
