import type { MetadataRoute } from "next";
import { RELEASES } from "../features/changelog/releases";
import { absoluteUrl, PUBLIC_PAGES } from "../lib/seo";

/** Every public page. Pages that change with releases take the newest release date; the rest leave it out rather than guess. */
export default function sitemap(): MetadataRoute.Sitemap {
  const newest = RELEASES[0]?.date;
  const withDate = new Set(["/", "/download", "/changelog"]);
  return PUBLIC_PAGES.flatMap((p) => {
    const url = absoluteUrl(p.path);
    if (!url) return [];
    return [{ url, changeFrequency: p.changeFrequency, priority: p.priority, ...(newest && withDate.has(p.path) ? { lastModified: newest } : {}) }];
  });
}
