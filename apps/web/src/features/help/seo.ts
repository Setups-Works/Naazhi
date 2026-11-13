import type { Metadata } from "next";
import { publicEnv } from "../../config/env";
import { helpHref, helpPath, isHelpSplit } from "../../lib/hosts";
import { absoluteUrl, SITE_NAME, siteOrigin } from "../../lib/seo";
import { categoryBySlug } from "./articles";
import type { Block, HelpArticle, HelpCategory } from "./types";

/*
 * Search-engine side of the help center. When it has its own host (help.naazhi.app) it is a separate site to a search engine: its own
 * canonical addresses, its own sitemap and robots.txt, its own search-console property. When it is served under /help on the website
 * everything below resolves to that address instead. Nothing else in the code needs to know which of the two it is.
 */

type Json = Record<string, unknown>;
const drop = (o: Json): Json => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

export const HELP_NAME = `${SITE_NAME} Help`;
export const HELP_DESCRIPTION = "Answers for Naazhi: getting started, notes, tasks, journal, chat and AI, sign-in, plans and billing, the Android app and your data.";

/** The origin that relative addresses on help pages resolve against: the help host, or the website. */
export const helpBase = () => (isHelpSplit() ? publicEnv.helpUrl!.replace(/\/+$/, "") : siteOrigin());

/** The full public address of a help page. */
export const helpUrl = (path = "/") => absoluteUrl(path === "/" ? "/help" : `/help${path}`) ?? helpPath(path);

/** Metadata for a help page: canonical, language, and share cards, all on the help address. */
export function helpMeta({ title, description, path, noindex = false }: { title: string; description: string; path: string; noindex?: boolean }): Metadata {
  const url = helpPath(path);
  return {
    title,
    description,
    alternates: { canonical: url, languages: { en: url, "x-default": url } },
    openGraph: { type: "website", siteName: HELP_NAME, title, description, url, images: ["/help-center/opengraph-image"] },
    twitter: { card: "summary_large_image", title, description, images: ["/help-center/opengraph-image"] },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

const orgId = () => absoluteUrl("/#organization");
const siteId = () => `${helpUrl("/")}#website`;

/** The help center as a website of its own, published by Naazhi. Its search is real (/search?q=…), so it declares it. */
export const helpWebsiteSchema = (): Json =>
  drop({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": siteId(),
    name: HELP_NAME,
    url: helpUrl("/"),
    description: HELP_DESCRIPTION,
    inLanguage: "en",
    publisher: orgId() ? { "@id": orgId() } : undefined,
    potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${helpUrl("/search")}?q={search_term_string}` }, "query-input": "required name=search_term_string" },
  });

/** Home › Category › Article, with the help center as the first step (not the marketing site). */
export function helpBreadcrumb(trail: { name: string; path: string }[]): Json {
  const items = [{ name: HELP_NAME, path: "/" }, ...trail];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.name, item: helpUrl(x.path) })),
  };
}

/** The front page or a category: a collection of articles. */
export function helpCollectionSchema({ name, description, path, items }: { name: string; description: string; path: string; items: readonly { name: string; description?: string; path: string }[] }): Json[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${helpUrl(path)}#webpage`,
      name,
      description,
      url: helpUrl(path),
      inLanguage: "en",
      isPartOf: { "@id": siteId() },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: items.length,
        itemListElement: items.map((x, i) => drop({ "@type": "ListItem", position: i + 1, name: x.name, description: x.description, url: helpUrl(x.path) })),
      },
    },
  ];
}

const textOf = (b: Block) => ("text" in b ? b.text : b.items.join(" "));

/** One article: a TechArticle, and a HowTo when it is a procedure with numbered steps. */
export function helpArticleSchemas(a: HelpArticle): Json[] {
  const cat: HelpCategory | undefined = categoryBySlug(a.category);
  const path = `/${a.category}/${a.slug}`;
  const steps = a.blocks.find((b): b is Extract<Block, { type: "steps" }> => b.type === "steps");
  const docs: Json[] = [
    drop({
      "@context": "https://schema.org",
      "@type": "TechArticle",
      "@id": `${helpUrl(path)}#article`,
      headline: a.title,
      description: a.summary,
      url: helpUrl(path),
      mainEntityOfPage: helpUrl(path),
      dateModified: a.updated,
      inLanguage: "en",
      articleSection: cat?.title,
      keywords: a.keywords.join(", "),
      articleBody: a.blocks.map(textOf).join(" "),
      isPartOf: { "@id": siteId() },
      about: absoluteUrl("/#software") ? { "@id": absoluteUrl("/#software") } : { "@type": "SoftwareApplication", name: SITE_NAME },
      author: orgId() ? { "@id": orgId() } : { "@type": "Organization", name: SITE_NAME },
      publisher: orgId() ? { "@id": orgId() } : { "@type": "Organization", name: SITE_NAME },
    }),
    helpBreadcrumb([...(cat ? [{ name: cat.title, path: `/${cat.slug}` }] : []), { name: a.title, path }]),
  ];
  if (steps) {
    docs.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "@id": `${helpUrl(path)}#howto`,
      name: a.title,
      description: a.summary,
      step: steps.items.map((text, i) => ({ "@type": "HowToStep", position: i + 1, text })),
    });
  }
  return docs;
}

/** Everything the help center puts in its sitemap: the front page, each category and each article, dated by when it was last checked. */
export function helpSitemapEntries(articles: readonly HelpArticle[], categories: readonly HelpCategory[], updated: string) {
  return [
    { url: helpUrl("/"), lastModified: updated, changeFrequency: "weekly" as const, priority: 1 },
    ...categories.map((c) => ({ url: helpUrl(`/${c.slug}`), lastModified: updated, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...articles.map((a) => ({ url: helpUrl(`/${a.category}/${a.slug}`), lastModified: a.updated, changeFrequency: "monthly" as const, priority: a.popular ? 0.8 : 0.6 })),
  ];
}

export { helpHref };
