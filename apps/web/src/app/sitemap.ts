import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { publicEnv } from "../config/env";
import { ARTICLES, CATEGORIES, HELP_UPDATED } from "../features/help/articles";
import { helpSitemapEntries } from "../features/help/seo";
import { isHelpSplit } from "../lib/hosts";
import { RELEASES } from "../features/changelog/releases";
import { LEGAL_UPDATED_ISO } from "../lib/legal";
import { absoluteUrl, OWN_OG_PATHS, PUBLIC_PAGES } from "../lib/seo";

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
  "/about",
  "/roadmap",
]);

/** Pages whose text is a policy: they take the policy date, the one printed on the page. */
const POLICY_PAGES = new Set(["/privacy", "/terms", "/refund-policy", "/cookies", "/accessibility", "/responsible-disclosure", "/copyright-and-licensing", "/contact"]);

/**
 * Every public page, with its address, how often it changes, a language alternate and its share picture. The addresses are built from
 * the site origin (NEXT_PUBLIC_SITE_URL, or the default for the build), so the list is never empty.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const help = helpSitemapEntries(ARTICLES, CATEGORIES, HELP_UPDATED);
  // The help center on its own host is a separate site to a search engine, so that host lists only its own pages. (Everything else is
  // listed on the website's sitemap; sitemaps must not name URLs on another host.)
  if (isHelpSplit()) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host === new URL(publicEnv.helpUrl!).host) return help;
  }
  const newest = RELEASES[0]?.date;
  const site = PUBLIC_PAGES.map((p) => {
    const url = absoluteUrl(p.path)!;
    const image = p.path === "/" ? absoluteUrl("/opengraph-image") : absoluteUrl(`${p.path}/opengraph-image`);
    return {
      url,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
      ...(newest && FOLLOWS_RELEASES.has(p.path) ? { lastModified: newest } : POLICY_PAGES.has(p.path) ? { lastModified: LEGAL_UPDATED_ISO } : {}),
      alternates: { languages: { en: url } },
      ...(OWN_OG_PATHS.has(p.path) && image ? { images: [image] } : {}),
    };
  });
  // With no host of its own the help center is part of this site, under /help.
  return isHelpSplit() ? site : [...site, ...help];
}
