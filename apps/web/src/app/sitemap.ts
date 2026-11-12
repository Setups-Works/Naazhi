import type { MetadataRoute } from "next";
import { RELEASES } from "../features/changelog/releases";
import { absoluteUrl, PUBLIC_PAGES } from "../lib/seo";

/** Pages whose content moves with the product, so they take the newest release date. The legal pages leave the date out rather than guess one. */
const FOLLOWS_RELEASES = new Set([
  "/",
  "/download",
  "/changelog",
  "/faq",
  "/how-it-works",
  "/pricing",
  "/integrations",
  "/features/notes",
  "/features/tasks",
  "/features/journal",
]);

/** Pages with a share picture of their own (the others use the site-wide one at /opengraph-image). */
const OWN_IMAGE = new Set(["/", "/faq", "/integrations", "/features/notes", "/features/tasks", "/features/journal"]);

/**
 * Every public page, with its address, how often it changes, a language alternate and its share picture. The addresses are built from
 * the site origin (NEXT_PUBLIC_SITE_URL, or the default for the build), so the list is never empty.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const newest = RELEASES[0]?.date;
  return PUBLIC_PAGES.map((p) => {
    const url = absoluteUrl(p.path)!;
    const image = p.path === "/" ? absoluteUrl("/opengraph-image") : absoluteUrl(`${p.path}/opengraph-image`);
    return {
      url,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
      ...(newest && FOLLOWS_RELEASES.has(p.path) ? { lastModified: newest } : {}),
      alternates: { languages: { en: url } },
      ...(OWN_IMAGE.has(p.path) && image ? { images: [image] } : {}),
    };
  });
}
