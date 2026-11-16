import { adminDb, serverConfigured } from "../../../../server/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * The bar at the top of the public website: the newest active announcement an admin placed on the website (Admin → Announcements).
 * Public by design and read-only; it only ever returns the message the admin chose to publish. Cached for a minute so a busy page doesn't
 * hit the database for every visitor.
 */
export async function GET() {
  const reply = (data: unknown) => NextResponse.json({ data }, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
  if (!serverConfigured()) return reply(null);
  const { data } = await adminDb()
    .from("announcements")
    .select("id,message,tone,link_label,link_href")
    .eq("active", true)
    .in("placement", ["site", "both"])
    .order("created_at", { ascending: false })
    .limit(1);
  const a = (data ?? [])[0] as { id: string; message: string; tone: string; link_label: string | null; link_href: string | null } | undefined;
  return reply(a ?? null);
}
