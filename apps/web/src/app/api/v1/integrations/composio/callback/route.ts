import { NextResponse } from "next/server";
import { serverEnv } from "../../../../../../config/env";
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
  const sp = new URL(req.url).searchParams;
  const back = (result: "connected" | "error", message?: string) => {
    const url = new URL(publicPath("/dashboard/settings/google"), base);
    url.searchParams.set("composio", result);
    if (message) url.searchParams.set("msg", message.slice(0, 200));
    return NextResponse.redirect(url, { headers: { "cache-control": "no-store" } });
  };
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL("/login", base));
  const code = sp.get("code");
  const state = sp.get("state");
  if (sp.get("error") || !code || !state) return back("error", "The sign-in didn’t finish. Try again.");
  try {
    await finishGoogleConnect(user.id, { code, state });
    return back("connected");
  } catch (e) {
    if (e instanceof ServiceError) return back("error", e.message);
    console.error("google sign-in failed", e instanceof Error ? e.name : "unknown error");
    return back("error", "Something went wrong connecting Google. Try again.");
  }
}
