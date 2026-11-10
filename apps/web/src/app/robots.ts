import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { publicEnv } from "../config/env";
import { isSplit } from "../lib/hosts";
import { absoluteUrl, PRIVATE_PATHS } from "../lib/seo";

/**
 * Crawlers may read the public site; the app, admin, API and share links stay out of search. When the app has its own host
 * (app.naazhi.com) nothing on it is for search engines at all.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  if (isSplit()) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host === new URL(publicEnv.appUrl!).host) return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  const sitemap = absoluteUrl("/sitemap.xml");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE_PATHS }],
    ...(sitemap ? { sitemap } : {}),
  };
}
