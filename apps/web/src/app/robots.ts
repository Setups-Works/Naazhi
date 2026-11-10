import type { MetadataRoute } from "next";
import { absoluteUrl, PRIVATE_PATHS } from "../lib/seo";

/** Crawlers may read the public site; the app, admin, API and share links stay out of search. */
export default function robots(): MetadataRoute.Robots {
  const sitemap = absoluteUrl("/sitemap.xml");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE_PATHS }],
    ...(sitemap ? { sitemap } : {}),
  };
}
