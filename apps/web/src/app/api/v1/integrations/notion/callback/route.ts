import { NextResponse } from "next/server";
import { serverEnv } from "../../../../../../config/env";
import { publicPath } from "../../../../../../lib/hosts";
import { ServiceError } from "../../../../../../server/errors";
import { currentUser } from "../../../../../../server/session";
import { finishNotionConnect } from "../../../../../../server/services/notion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Composio sends the person back here after Notion's sign-in. The status in the address is only a hint: the service asks Composio
 * itself whether this person's connection is active. Then the person returns to Settings → Imports & backup.
 */
export async function GET(req: Request) {
  const base = serverEnv().authUrl.replace(/\/+$/, "");
  const back = (result: "connected" | "error", message?: string) => {
    const url = new URL(publicPath("/dashboard/settings/imports"), base);
    url.searchParams.set("notion", result);
    if (message) url.searchParams.set("msg", message.slice(0, 200));
    return NextResponse.redirect(url, { headers: { "cache-control": "no-store" } });
  };
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL("/login", base));
  if (new URL(req.url).searchParams.get("status") === "failed") return back("error", "The sign-in didn’t finish. Try again.");
  try {
    await finishNotionConnect(user.id);
    return back("connected");
  } catch (e) {
    if (e instanceof ServiceError) return back("error", e.message);
    console.error("notion sign-in failed", e instanceof Error ? e.name : "unknown error");
    return back("error", "Something went wrong connecting Notion. Try again.");
  }
}
