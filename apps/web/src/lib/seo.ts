import type { Metadata } from "next";
import { defaultSiteOrigin, publicEnv } from "../config/env";
import { GITHUB_REPO } from "./site";

/*
 * Everything search engines and link previews read, in one place: page metadata, the sitemap's page list and the schema.org (JSON-LD)
 * documents. Absolute URLs need NEXT_PUBLIC_SITE_URL (see .env.example); without it the schema simply leaves the url fields out
 * instead of inventing a host.
 */

export const SITE_NAME = "Naazhi";
export const SITE_TAGLINE = "One workspace, any AI";
export const SITE_DESCRIPTION =
  "Notes, tasks, journal, email, calendar, meetings and automations in one workspace. Use AI when it helps, ignore it when it doesn't.";
export const KEYWORDS = [
  "Naazhi",
  "workspace app",
  "notes app",
  "task manager",
  "private journal",
  "AI notes",
  "bring your own API key",
  "AI-free workspace",
  "universal search",
  "daily brief",
  "calendar and tasks",
];

/** The public pages, in sitemap order. `priority` is a hint, not a promise. */
export const PUBLIC_PAGES: { path: string; priority: number; changeFrequency: "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/how-it-works", priority: 0.8, changeFrequency: "monthly" },
  { path: "/download", priority: 0.9, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
  { path: "/demo", priority: 0.7, changeFrequency: "monthly" },
  { path: "/universal-search", priority: 0.7, changeFrequency: "monthly" },
  { path: "/context-graph", priority: 0.6, changeFrequency: "monthly" },
  { path: "/daily-brief", priority: 0.6, changeFrequency: "monthly" },
  { path: "/privacy-security", priority: 0.7, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.5, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.4, changeFrequency: "monthly" },
  { path: "/refund-policy", priority: 0.4, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
  { path: "/early-users", priority: 0.5, changeFrequency: "monthly" },
  { path: "/changelog", priority: 0.6, changeFrequency: "weekly" },
  { path: "/faq", priority: 0.8, changeFrequency: "monthly" },
  { path: "/features/notes", priority: 0.8, changeFrequency: "monthly" },
  { path: "/features/tasks", priority: 0.8, changeFrequency: "monthly" },
  { path: "/features/journal", priority: 0.8, changeFrequency: "monthly" },
  { path: "/integrations", priority: 0.8, changeFrequency: "monthly" },
];

/**
 * The main pages as a visitor would name them, with one line each. Search engines choose their own sitelinks, but clear names, short
 * descriptions and a site-navigation list are the signals they use. Also feeds /llms.txt, so the list lives in one place.
 */
export const SITE_NAV: { name: string; path: string; description: string }[] = [
  {
    name: "How it works",
    path: "/how-it-works",
    description: "How notes, tasks, journal, chat and calendar fit together, and where AI is optional.",
  },
  { name: "Download", path: "/download", description: "Get the Android app or open the web app." },
  { name: "Pricing", path: "/pricing", description: "The plans, what each includes, and how AI access works." },
  { name: "Product demo", path: "/demo", description: "Click around an interactive preview of the workspace." },
  { name: "Universal search", path: "/universal-search", description: "Find anything across notes, tasks, journal and chat." },
  { name: "Privacy & security", path: "/privacy-security", description: "How your workspace stays yours." },
  {
    name: "Notes",
    path: "/features/notes",
    description: "Rich notes with voice, attachments, version history and a Trash you can restore from.",
  },
  { name: "Tasks", path: "/features/tasks", description: "Lists, priorities and repeats in a list, board or calendar view." },
  { name: "Journal", path: "/features/journal", description: "A private journal, and shared journals you write together." },
  { name: "Integrations", path: "/integrations", description: "Connect Google and Zoho apps and ask about them from chat." },
  { name: "FAQ", path: "/faq", description: "Straight answers on AI, privacy, plans, apps and what works today." },
  { name: "Changelog", path: "/changelog", description: "What’s new in the web app and the Android app." },
  { name: "Contact", path: "/contact", description: "How to reach the team behind Naazhi." },
];

/** Where the app, not the marketing site, lives. Kept out of search results and the sitemap. */
export const PRIVATE_PATHS = ["/dashboard", "/admin", "/api", "/share", "/login", "/signup", "/forgot-password", "/reset-password"];

/** The site's origin without a trailing slash: NEXT_PUBLIC_SITE_URL, or the default for this build (see config/env.ts). */
export const siteOrigin = () => (publicEnv.siteUrl ?? defaultSiteOrigin).replace(/\/+$/, "");

/** An absolute URL for a path, when the origin is known. */
export const absoluteUrl = (path: string) => {
  const origin = siteOrigin();
  return origin ? `${origin}${path === "/" ? "" : path}` : undefined;
};

/** Page metadata with a canonical address and matching Open Graph and Twitter cards. */
export function pageMeta({
  title,
  description,
  path,
  ownImage = false,
}: {
  title: string;
  description: string;
  path: string;
  /** The page has its own opengraph-image file; otherwise it shows the site-wide share picture. */ ownImage?: boolean;
}): Metadata {
  // A page that sets its own openGraph/twitter replaces the site-wide ones, share picture included, so name the picture again.
  const images = ownImage ? undefined : ["/opengraph-image"];
  return {
    title,
    description,
    // One language today: say so, and name it the default, so search engines never go looking for another version.
    alternates: { canonical: path, languages: { en: path, "x-default": path } },
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url: path, ...(images ? { images } : {}) },
    twitter: { card: "summary_large_image", title, description, ...(images ? { images } : {}) },
  };
}

type Json = Record<string, unknown>;
const drop = (o: Json): Json => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/**
 * The agency behind Naazhi. The facts come from the Setups Works site's own structured data (its siteConfig), so both sites describe the
 * same entity: the @id below is the one setups.works publishes, which lets search engines merge the two descriptions into one.
 * Company profiles only; the founder's personal profiles stay out so the person and the company aren't conflated.
 */
export const SETUPS_WORKS = {
  id: "https://setups.works/#organization",
  name: "Setups Works",
  alternateName: ["SetupsWorks", "setups.works", "Setups Works Digital Agency"],
  tagline: "The Digital Agency.",
  slogan: "Design. Develop. Grow.",
  description:
    "Setups Works is a premium digital agency crafting high-performance websites, web & mobile apps, AI products, and brand experiences that move businesses forward.",
  url: "https://setups.works",
  email: "info@setups.works",
  telephone: "+91 6383984698",
  foundingDate: "2020-06-20",
  numberOfEmployees: 10,
  address: {
    street: "1009G, Govintha Reddy Street, Elavur",
    locality: "Gummidipoondi",
    region: "Tamil Nadu",
    postalCode: "601201",
    country: "IN",
  },
  areaServed: ["Chennai", "Tamil Nadu", "India", "Worldwide"],
  knowsAbout: [
    "Web Development",
    "Mobile App Development",
    "AI Development",
    "Automation",
    "CRM Development",
    "UI/UX Design",
    "SEO",
    "Digital Marketing",
    "SaaS Products",
  ],
  founder: {
    id: "https://setups.works/#founder",
    name: "Nitheesh Rajendran",
    jobTitle: "Founder & CEO",
    url: "https://setups.works/about/nitheesh-rajendran",
  },
  sameAs: [
    "https://x.com/setupsworks",
    "https://linkedin.com/company/setups-works",
    "https://instagram.com/setups.works",
    "https://play.google.com/store/apps/dev?id=5478157836712207943",
    "https://maps.google.com/?cid=12795956607791697816",
    "https://www.wikidata.org/wiki/Q140500419",
    "https://www.crunchbase.com/organization/setups-works",
  ],
};

const setupsWorksRef = () => ({ "@id": SETUPS_WORKS.id });

/** Setups Works as an organization in its own right, with a way to reach it. */
export const setupsWorksSchema = (): Json => {
  const s = SETUPS_WORKS;
  const naazhi = absoluteUrl("/#organization");
  return drop({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": s.id,
    name: s.name,
    legalName: s.name,
    alternateName: s.alternateName,
    description: s.description,
    slogan: s.slogan,
    url: s.url,
    logo: { "@type": "ImageObject", url: "https://setups.works/icon-512.png", width: 512, height: 512 },
    email: s.email,
    telephone: s.telephone,
    foundingDate: s.foundingDate,
    numberOfEmployees: { "@type": "QuantitativeValue", value: s.numberOfEmployees },
    address: {
      "@type": "PostalAddress",
      streetAddress: s.address.street,
      addressLocality: s.address.locality,
      addressRegion: s.address.region,
      postalCode: s.address.postalCode,
      addressCountry: s.address.country,
    },
    areaServed: s.areaServed,
    knowsAbout: s.knowsAbout,
    founder: { "@type": "Person", "@id": s.founder.id, name: s.founder.name, jobTitle: s.founder.jobTitle, url: s.founder.url },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: s.telephone,
        email: s.email,
        areaServed: s.areaServed,
        availableLanguage: ["English"],
      },
    ],
    // Naazhi, stated from this side too, so the relationship holds both ways.
    subOrganization: naazhi ? { "@id": naazhi } : undefined,
    sameAs: s.sameAs,
  });
};

export const organizationSchema = (): Json =>
  drop({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: SITE_NAME,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/brand/icon-512.png"),
    sameAs: [GITHUB_REPO],
    email: SETUPS_WORKS.email,
    parentOrganization: setupsWorksRef(),
  });

export const websiteSchema = (): Json =>
  drop({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: SITE_NAME,
    alternateName: `${SITE_NAME} — ${SITE_TAGLINE}`,
    url: absoluteUrl("/"),
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    publisher: absoluteUrl("/#organization") ? { "@id": absoluteUrl("/#organization") } : undefined,
  });

/** The app as software: free to start, available on Android and the web. */
export function softwareSchema({
  version,
  released,
  features,
  screenshots,
}: {
  version?: string;
  released?: string;
  /** What the app does today (live capabilities only). */ features?: readonly string[];
  /** Paths of app screens under /public. */ screenshots?: readonly string[];
} = {}): Json {
  return drop({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": absoluteUrl("/#software"),
    name: SITE_NAME,
    alternateName: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: absoluteUrl("/"),
    applicationCategory: "ProductivityApplication",
    applicationSubCategory: "Notes, tasks and journal",
    operatingSystem: "Android, Web",
    inLanguage: "en",
    isAccessibleForFree: true,
    featureList: features && features.length ? [...features] : undefined,
    screenshot: screenshots && screenshots.length ? screenshots.map((s) => ({ "@type": "ImageObject", url: absoluteUrl(s) })) : undefined,
    softwareVersion: version?.replace(/^v/, ""),
    datePublished: released,
    downloadUrl: `${GITHUB_REPO}/releases/latest`,
    image: absoluteUrl("/opengraph-image"),
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free workspace. AI is optional and paid separately." },
    publisher: { "@type": "Organization", name: SITE_NAME },
  });
}

/**
 * The FAQ as schema.org FAQPage. With `page`, each question also gets its own address (`/faq#the-question`) and the page says what it
 * is part of and when it last changed, which is what lets a search engine cite a single answer. The answers must be the ones shown.
 */
export const faqSchema = (
  items: readonly (readonly [string, string])[],
  page?: { path: string; name: string; description: string; dateModified?: string; anchor: (q: string) => string },
): Json =>
  drop({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    ...(page
      ? {
          "@id": absoluteUrl(`${page.path}#faq`),
          name: page.name,
          description: page.description,
          url: absoluteUrl(page.path),
          inLanguage: "en",
          dateModified: page.dateModified,
          isPartOf: absoluteUrl("/#website") ? { "@id": absoluteUrl("/#website") } : undefined,
          about: { "@type": "SoftwareApplication", name: SITE_NAME },
        }
      : {}),
    mainEntity: items.map(([q, a]) =>
      drop({
        "@type": "Question",
        "@id": page ? absoluteUrl(`${page.path}#${page.anchor(q)}`) : undefined,
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      }),
    ),
  });

/** A list of things as schema.org ItemList: the product's features, the apps it connects to, the latest releases. Names are required; urls and descriptions are kept when given. */
export function itemListSchema({
  name,
  items,
  path,
}: {
  name: string;
  path?: string;
  items: readonly { name: string; description?: string; path?: string }[];
}): Json {
  return drop({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url: path ? absoluteUrl(path) : undefined,
    numberOfItems: items.length,
    itemListElement: items.map((x, i) =>
      drop({
        "@type": "ListItem",
        position: i + 1,
        name: x.name,
        description: x.description,
        url: x.path ? absoluteUrl(x.path) : undefined,
      }),
    ),
  });
}

/** Steps as schema.org HowTo, for a page that really is a short procedure (connecting an app from chat). */
export const howToSchema = ({
  name,
  description,
  path,
  steps,
}: {
  name: string;
  description: string;
  path: string;
  steps: readonly { name: string; text: string }[];
}): Json =>
  drop({
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    url: absoluteUrl(path),
    inLanguage: "en",
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
      url: absoluteUrl(`${path}#step-${i + 1}`),
    })),
  });

/** The releases as a list of dated works, newest first, for the changelog page. */
export const releasesSchema = (releases: readonly { title: string; summary: string; date: string }[], limit = 10): Json =>
  drop({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${SITE_NAME} changelog`,
    url: absoluteUrl("/changelog"),
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: Math.min(releases.length, limit),
    itemListElement: releases.slice(0, limit).map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: { "@type": "CreativeWork", name: r.title, description: r.summary, datePublished: r.date, inLanguage: "en" },
    })),
  });

/** Breadcrumb trail: Home, then each page. Skipped (undefined) when the origin is unknown, since list items need absolute URLs. */
export function breadcrumbSchema(trail: { name: string; path: string }[]): Json | undefined {
  const items = [{ name: "Home", path: "/" }, ...trail];
  if (!siteOrigin()) return undefined;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": absoluteUrl(`${trail[trail.length - 1]?.path ?? ""}#breadcrumb`),
    itemListElement: items.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.name, item: absoluteUrl(x.path) })),
  };
}

/** The two documents every public page carries: the page itself and its breadcrumb trail. */
export const pageSchemas = ({
  name,
  title,
  description,
  path,
  image,
  about,
  dateModified,
}: {
  name: string;
  title: string;
  description: string;
  path: string;
  image?: string;
  about?: string;
  dateModified?: string;
}) => [webPageSchema({ name: title, description, path, image, about, dateModified }), breadcrumbSchema([{ name, path }])];

/** A web page of the site, with the page it belongs to. */
export const webPageSchema = ({
  name,
  description,
  path,
  dateModified,
  about,
  image,
}: {
  name: string;
  description: string;
  path: string;
  dateModified?: string;
  /** Path of the page's own share picture; the site-wide one when it has none. */
  image?: string;
  /** What the page is about, when it is a part of the product (a feature page). */
  about?: string;
}): Json =>
  drop({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": absoluteUrl(`${path === "/" ? "" : path}#webpage`),
    name,
    description,
    url: absoluteUrl(path),
    dateModified,
    about: about ? { "@type": "Thing", name: about } : undefined,
    primaryImageOfPage: { "@type": "ImageObject", url: absoluteUrl(image ?? "/opengraph-image") },
    breadcrumb: path === "/" ? undefined : { "@id": absoluteUrl(`${path}#breadcrumb`) },
    isPartOf: absoluteUrl("/#website") ? { "@id": absoluteUrl("/#website") } : undefined,
    inLanguage: "en",
  });

/** The site's main navigation as schema.org SiteNavigationElement entries: the structured-data signal for sitelinks. Skipped without an origin. */
export function siteNavigationSchema(): Json | undefined {
  if (!siteOrigin()) return undefined;
  return {
    "@context": "https://schema.org",
    "@graph": SITE_NAV.map((n) => ({
      "@type": "SiteNavigationElement",
      "@id": absoluteUrl(`${n.path}#nav`),
      name: n.name,
      description: n.description,
      url: absoluteUrl(n.path),
    })),
  };
}

/** The longer plain-text guide (served at /llms-full.txt): everything in llms.txt plus every question and answer, so an assistant can cite them without crawling. */
export function llmsFullText(faqs: readonly (readonly [string, string])[]): string {
  return [llmsText().trimEnd(), "", "## Questions and answers", "", ...faqs.flatMap(([q, a]) => [`### ${q}`, a, ""])].join("\n");
}

/** The plain-text guide for AI assistants and crawlers (served at /llms.txt): what Naazhi is, then the pages worth reading. */
export function llmsText(): string {
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_TAGLINE}. ${SITE_DESCRIPTION}`,
    "",
    "## Pages",
    ...SITE_NAV.map((n) => `- [${n.name}](${absoluteUrl(n.path) ?? n.path}): ${n.description}`),
    "",
    "## Notes",
    "- The app itself (dashboard, sign-in, shared links) is private and not for indexing.",
    `- Made by ${SETUPS_WORKS.name} (${SETUPS_WORKS.url}).`,
    "",
  ];
  return lines.join("\n");
}
