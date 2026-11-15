import { NextResponse } from "next/server";
import { json } from "../../../../server/http";
import { verifyUnsubscribe } from "../../../../server/email/campaign";
import { unsubscribe } from "../../../../server/repositories/campaigns.repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Unsubscribe from newsletters. Public, but the address and its signature come from the link in the email, so nobody can unsubscribe
 * someone else. POST only: a link scanner that opens the address must not unsubscribe anyone. Mail apps' one-click button (RFC 8058) posts
 * here too; the page's own button adds `page=1` to be sent back to the confirmation.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const email = verifyUnsubscribe(url.searchParams.get("e"), url.searchParams.get("t"));
  if (!email) return json({ error: "This link isn’t valid." }, 400);
  await unsubscribe(email);
  const form = await req.formData().catch(() => null);
  if (form?.get("page") === "1") return NextResponse.redirect(new URL("/unsubscribe?done=1", req.url), 303);
  return json({ ok: true });
}
