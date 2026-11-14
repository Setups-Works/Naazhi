import { NextResponse } from "next/server";
import { serverEnv } from "../../../../../../config/env";
import { composioSettingsPath, isComposioApp } from "../../../../../../lib/composio/apps";
import { publicPath } from "../../../../../../lib/hosts";
import { ServiceError } from "../../../../../../server/errors";
import { currentUser } from "../../../../../../server/session";
import { finishComposioConnect } from "../../../../../../server/services/composio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Composio sends the person back here after the app's sign-in (`?app=gmail&status=success`). The status in the address is only a
 * hint: the service asks Composio itself whether this person's connection is active. Then the person returns to Settings.
 */
export async function GET(req: Request) {
  const base = serverEnv().authUrl.replace(/\/+$/, "");
  const sp = new URL(req.url).searchParams;
  const app = sp.get("app");
  const back = (result: "connected" | "error", message?: string) => {
    const url = new URL(publicPath(isComposioApp(app) ? composioSettingsPath(app) : "/dashboard/settings/google"), base);
    url.searchParams.set("composio", result);
    if (isComposioApp(app)) url.searchParams.set("app", app);
    if (message) url.searchParams.set("msg", message.slice(0, 200));
    return NextResponse.redirect(url, { headers: { "cache-control": "no-store" } });
  };
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL("/login", base));
  if (!isComposioApp(app)) return back("error", "That sign-in link isn’t one Naazhi made. Start again from Settings.");
  if (sp.get("status") === "failed") return back("error", "The sign-in didn’t finish. Try again.");
  try {
    await finishComposioConnect(user.id, app);
    return back("connected");
  } catch (e) {
    if (e instanceof ServiceError) return back("error", e.message);
    console.error("composio sign-in failed", e instanceof Error ? e.name : "unknown error");
    return back("error", "Something went wrong connecting that app. Try again.");
  }
}
