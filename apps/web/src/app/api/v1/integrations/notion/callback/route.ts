import { NextResponse } from "next/server";
import { serverEnv } from "../../../../../../config/env";
import { CONNECT_RETURN_COOKIE, readConnectReturn } from "../../../../../../lib/connectReturn";
import { publicPath } from "../../../../../../lib/hosts";
import { ServiceError } from "../../../../../../server/errors";
import { currentUser } from "../../../../../../server/session";
import { finishNotionConnect, verifyNotionReturn } from "../../../../../../server/services/notion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Composio sends the person back here after Notion's sign-in. The status in the address is only a hint: the service asks Composio
 * itself whether this person's connection is active. Then the person returns to Settings → Imports & backup.
 */
export async function GET(req: Request) {
  const base = serverEnv().authUrl.replace(/\/+$/, "");
  const returnTo = readConnectReturn(req.headers.get("cookie"));
  const back = (result: "connected" | "error", message?: string) => {
    const url = new URL(publicPath(returnTo ?? "/dashboard/settings/imports"), base);
    url.searchParams.set("notion", result);
    if (message) url.searchParams.set("msg", message.slice(0, 200));
    const res = NextResponse.redirect(url, { headers: { "cache-control": "no-store" } });
    if (returnTo) res.cookies.set(CONNECT_RETURN_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  };
  const sp = new URL(req.url).searchParams;
  // The person's session, or (the phone's in-app sheet has none) the signed note this sign-in carried in its address.
  const userId = (await currentUser())?.id ?? verifyNotionReturn(sp.get("u"));
  if (!userId) return NextResponse.redirect(new URL("/login", base));
  if (sp.get("status") === "failed") return back("error", "The sign-in didn’t finish. Try again.");
  try {
    await finishNotionConnect(userId);
    return back("connected");
  } catch (e) {
    if (e instanceof ServiceError) return back("error", e.message);
    console.error("notion sign-in failed", e instanceof Error ? e.name : "unknown error");
    return back("error", "Something went wrong connecting Notion. Try again.");
  }
}
