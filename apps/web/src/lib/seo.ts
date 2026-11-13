import type { Metadata } from "next";
import { defaultSiteOrigin, publicEnv } from "../config/env";
import { isHelpSplit } from "./hosts";
import { GITHUB_REPO, GOOGLE_PLAY_URL, INSTAGRAM_URL, X_URL } from "./site";

/*
 * Everything search engines and link previews read, in one place: page metadata, the sitemap's page list and the schema.org (JSON-LD)
 * documents. Absolute URLs need NEXT_PUBLIC_SITE_URL (see .env.example); without it the schema simply leaves the url fields out
 * instead of inventing a host.
 */

export const SITE_NAME = "Naazhi";
export const SITE_TAGLINE = "One workspace, any AI";
export const SITE_DESCRIPTION =
  "Notes, tasks, journal, chat and calendar in one workspace. Use AI when it helps, swap it, bring your own key, or switch it off.";
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
  { path: "/copyright-and-licensing", priority: 0.3, changeFrequency: "monthly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/roadmap", priority: 0.6, changeFrequency: "weekly" },
  { path: "/feature-requests", priority: 0.4, changeFrequency: "monthly" },
  { path: "/cookies", priority: 0.3, changeFrequency: "monthly" },
  { path: "/accessibility", priority: 0.3, changeFrequency: "monthly" },
  { path: "/responsible-disclosure", priority: 0.3, changeFrequency: "monthly" },
  { path: "/team", priority: 0.6, changeFrequency: "monthly" },
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
  { name: "Roadmap", path: "/roadmap", description: "What Naazhi is building now, what is planned next and what shipped." },
  { name: "Request a feature", path: "/feature-requests", description: "Tell us what Naazhi should do next." },
  { name: "Changelog", path: "/changelog", description: "What’s new in the web app and the Android app." },
  { name: "About", path: "/about", description: "What Naazhi is and what we believe." },
  { name: "Team", path: "/team", description: "The people who build Naazhi." },
  { name: "Help center", path: "/help", description: "Guides, answers and troubleshooting, with a person to write to." },
  { name: "Contact", path: "/contact", description: "How to reach the team behind Naazhi." },
];

/** Pages with a share picture of their own (an opengraph-image file next to the page); the others use the site-wide one at /opengraph-image. */
export const OWN_OG_PATHS: ReadonlySet<string> = new Set([
  "/",
  "/faq",
  "/integrations",
  "/features/notes",
  "/features/tasks",
  "/features/journal",
  "/about",
  "/roadmap",
  "/pricing",
  "/download",
  "/how-it-works",
  "/demo",
  "/changelog",
  "/universal-search",
  "/context-graph",
  "/daily-brief",
  "/early-users",
  "/team",
]);

/** Where the app, not the marketing site, lives. Kept out of search results and the sitemap. */
export const PRIVATE_PATHS = ["/dashboard", "/admin", "/api", "/share", "/login", "/signup", "/forgot-password", "/reset-password", "/help/search"];

/** The site's origin without a trailing slash: NEXT_PUBLIC_SITE_URL, or the default for this build (see config/env.ts). */
export const siteOrigin = () => (publicEnv.siteUrl ?? defaultSiteOrigin).replace(/\/+$/, "");

/**
 * An absolute URL for a path, when the origin is known. The help center's pages (/help, /help/…) are the one exception to "the website's
 * origin": when it has its own host (help.naazhi.app) its addresses are on that host, without the /help prefix.
 */
export const absoluteUrl = (path: string) => {
  if (isHelpSplit() && (path === "/help" || path.startsWith("/help/"))) {
    const rest = path.slice("/help".length);
    return `${publicEnv.helpUrl!.replace(/\/+$/, "")}${rest}`;
  }
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
 * The company behind Naazhi. The facts come from the Setups Works site's own structured data (its siteConfig), so both sites describe the
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
    "Setups Works is a technology company crafting high-performance websites, web & mobile apps, AI products, and brand experiences that move businesses forward.",
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
    // The Tamil name, so a search for நாழி finds the same entity.
    alternateName: ["நாழி", `${SITE_NAME} — ${SITE_TAGLINE}`],
    description: SITE_DESCRIPTION,
    slogan: SITE_TAGLINE,
    url: absoluteUrl("/"),
    logo: { "@type": "ImageObject", url: absoluteUrl("/brand/icon-512.png"), width: 512, height: 512 },
    image: absoluteUrl("/opengraph-image"),
    sameAs: [X_URL, INSTAGRAM_URL, GITHUB_REPO],
    email: SETUPS_WORKS.email,
    contactPoint: [
      { "@type": "ContactPoint", contactType: "customer support", email: SETUPS_WORKS.email, availableLanguage: ["English"], url: absoluteUrl("/contact") },
    ],
    knowsAbout: ["Notes", "To-do lists", "Journaling", "AI chat", "Calendar", "Personal knowledge management"],
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
    downloadUrl: GOOGLE_PLAY_URL,
    installUrl: GOOGLE_PLAY_URL,
    sameAs: [GOOGLE_PLAY_URL],
    softwareHelp: absoluteUrl("/help") ? { "@type": "CreativeWork", url: absoluteUrl("/help") } : undefined,
    releaseNotes: absoluteUrl("/changelog"),
    image: absoluteUrl("/opengraph-image"),
    // Prices are in rupees (see the pricing page); the free tier is price 0 in that currency.
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR", url: absoluteUrl("/pricing"), availability: "https://schema.org/InStock", description: "Free to start. AI is optional and paid separately." },
    publisher: absoluteUrl("/#organization") ? { "@id": absoluteUrl("/#organization") } : { "@type": "Organization", name: SITE_NAME },
    creator: setupsWorksRef(),
  });
}

/** The Android app as its own entity, so a search result can offer "Install" with the Google Play link (schema.org MobileApplication + InstallAction). */
export const androidAppSchema = (): Json =>
  drop({
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    "@id": absoluteUrl("/#android-app"),
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: GOOGLE_PLAY_URL,
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Android",
    installUrl: GOOGLE_PLAY_URL,
    downloadUrl: GOOGLE_PLAY_URL,
    image: absoluteUrl("/brand/icon-512.png"),
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR", availability: "https://schema.org/InStock" },
    isRelatedTo: { "@id": absoluteUrl("/#software") },
    publisher: { "@id": absoluteUrl("/#organization") },
    potentialAction: { "@type": "InstallAction", name: "Install Naazhi", target: GOOGLE_PLAY_URL },
  });

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

/** A person on the Team page, as far as structured data needs to know. */
export type TeamPerson = { slug: string; name: string; role: string; bio: string; photoUrl: string | null; links: { label: string; url: string }[] };

/** The address of one person's block on the Team page; also their @id in structured data. */
export const teamPersonId = (slug: string) => absoluteUrl(`/team#${slug}`);

/**
 * Structured data for the Team page: the page as an AboutPage, Naazhi's organization with its people, and one Person per member with a
 * job title, picture and their own profile links (sameAs). Everything comes from what the admin entered, nothing is invented. Search
 * engines decide for themselves whether to build a knowledge panel from it; consistent, verifiable profile links help.
 */
export function teamSchemas(people: readonly TeamPerson[], dateModified?: string): (Json | undefined)[] {
  const orgId = absoluteUrl("/#organization");
  const pageId = absoluteUrl("/team#page");
  const persons = people.map((p) =>
    drop({
      "@context": "https://schema.org",
      "@type": "Person",
      "@id": teamPersonId(p.slug),
      name: p.name,
      jobTitle: p.role,
      description: p.bio || undefined,
      image: p.photoUrl ? { "@type": "ImageObject", url: p.photoUrl } : undefined,
      url: teamPersonId(p.slug),
      sameAs: p.links.length ? p.links.map((l) => l.url) : undefined,
      worksFor: orgId ? { "@id": orgId } : undefined,
      mainEntityOfPage: pageId ? { "@id": pageId } : undefined,
    }),
  );
  return [
    drop({
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "@id": pageId,
      name: `The team behind ${SITE_NAME}`,
      description: `The people who build ${SITE_NAME}, by ${SETUPS_WORKS.name}.`,
      url: absoluteUrl("/team"),
      inLanguage: "en",
      dateModified,
      isPartOf: absoluteUrl("/#website") ? { "@id": absoluteUrl("/#website") } : undefined,
      about: orgId ? { "@id": orgId } : undefined,
      mainEntity: orgId ? { "@id": orgId } : undefined,
    }),
    orgId
      ? drop({
          "@context": "https://schema.org",
          "@type": "Organization",
          "@id": orgId,
          name: SITE_NAME,
          url: absoluteUrl("/"),
          parentOrganization: setupsWorksRef(),
          employee: people.length ? people.map((p) => ({ "@id": teamPersonId(p.slug) })) : undefined,
        })
      : undefined,
    ...persons,
    breadcrumbSchema([{ name: "Team", path: "/team" }]),
  ];
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
  type,
  mainEntity,
}: {
  name: string;
  title: string;
  description: string;
  path: string;
  image?: string;
  about?: string;
  dateModified?: string;
  type?: PageType;
  mainEntity?: "organization" | "software";
}) => [
  webPageSchema({ name: title, description, path, image: image ?? (OWN_OG_PATHS.has(path) ? (path === "/" ? "/opengraph-image" : `${path}/opengraph-image`) : undefined), about, dateModified, type, mainEntity }), breadcrumbSchema([{ name, path }])];

/** The more specific schema.org page types. Search engines and assistants use them to tell an About page from a Contact page from a list. */
export type PageType = "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage" | "FAQPage" | "ProfilePage";

/** A web page of the site, with the page it belongs to. */
export const webPageSchema = ({
  name,
  description,
  path,
  dateModified,
  about,
  image,
  type = "WebPage",
  mainEntity,
}: {
  name: string;
  description: string;
  path: string;
  type?: PageType;
  /** The thing the page is mainly about, referenced by id from the site-wide documents. */
  mainEntity?: "organization" | "software";
  dateModified?: string;
  /** Path of the page's own share picture; the site-wide one when it has none. */
  image?: string;
  /** What the page is about, when it is a part of the product (a feature page). */
  about?: string;
}): Json =>
  drop({
    "@context": "https://schema.org",
    "@type": type,
    "@id": absoluteUrl(`${path === "/" ? "" : path}#webpage`),
    name,
    description,
    url: absoluteUrl(path),
    dateModified,
    about: about ? { "@type": "Thing", name: about } : undefined,
    mainEntity: mainEntity && absoluteUrl(`/#${mainEntity}`) ? { "@id": absoluteUrl(`/#${mainEntity}`) } : undefined,
    publisher: absoluteUrl("/#organization") ? { "@id": absoluteUrl("/#organization") } : undefined,
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

/** What the plain-text guides know beyond the page list. Passed in by the routes so this file never imports page content. */
export type LlmsContext = {
  /** The product's features with their honest status, from the capability list. */
  capabilities?: readonly { t: string; d: string; status: "live" | "building" | "soon"; pts: readonly string[] }[];
  /** Newest first. */
  releases?: readonly { date: string; title: string; summary: string; appVersion?: string }[];
};

const STATUS_WORD = { live: "Live", building: "Building", soon: "Coming soon" } as const;

/** The pages an assistant should know about, grouped as a person would look for them. Names and lines come from SITE_NAV where it has the page. */
const LLMS_GROUPS: { title: string; blurb: string; paths: readonly string[] }[] = [
  { title: "Start here", blurb: "What Naazhi is and how to try it.", paths: ["/how-it-works", "/demo", "/pricing", "/download", "/faq"] },
  {
    title: "Features",
    blurb: "One page per part of the workspace.",
    paths: ["/features/notes", "/features/tasks", "/features/journal", "/universal-search", "/context-graph", "/daily-brief", "/integrations"],
  },
  { title: "Product direction", blurb: "What is shipping and what is planned.", paths: ["/roadmap", "/changelog", "/feature-requests", "/early-users"] },
  { title: "Company", blurb: "Who makes Naazhi.", paths: ["/about", "/team", "/contact"] },
  { title: "Help", blurb: "Guides and answers for using Naazhi.", paths: ["/help"] },
  {
    title: "Trust and policies",
    blurb: "How data, cookies, security reports and copyright are handled.",
    paths: ["/privacy-security", "/privacy", "/terms", "/refund-policy", "/cookies", "/accessibility", "/responsible-disclosure", "/copyright-and-licensing", "/status"],
  },
];

/** Pages in LLMS_GROUPS that SITE_NAV doesn't describe. */
const LLMS_EXTRA: Record<string, [string, string]> = {
  "/context-graph": ["Context Graph", "See how notes, threads, meetings and tasks connect."],
  "/daily-brief": ["Daily Brief", "Start the day with events, tasks and mail on one page."],
  "/early-users": ["Early users", "Be one of the first to shape Naazhi."],
  "/team": ["Team", "The people who build Naazhi."],
  "/contact": ["Contact", "Email, phone and postal address."],
  "/privacy": ["Privacy Policy", "What is collected, including health data, how long it is kept and how to delete it."],
  "/terms": ["Terms & Conditions", "The agreement for using Naazhi."],
  "/refund-policy": ["Refund & Cancellation", "How to cancel a plan and when a refund is possible."],
  "/cookies": ["Cookies & Storage", "The few cookies and browser storage items used. No advertising or analytics."],
  "/accessibility": ["Accessibility", "How Naazhi aims to be usable by everyone, and how to report a barrier."],
  "/responsible-disclosure": ["Report a security issue", "How to report a vulnerability safely."],
  "/copyright-and-licensing": ["Copyright & Licensing", "Who owns what on the site, and how it may be used."],
  "/status": ["Status", "Live check of the website and workspace services."],
};

const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10);

/**
 * The plain-text guide for AI assistants and crawlers (served at /llms.txt), in the order a model needs it: identity, then the facts it
 * will be asked to recall, then what is live and what is not, then links for depth. Every line is a plain, checkable claim; where a
 * feature is not available yet it says so, so an assistant never promises what a person can't use.
 */
export function llmsText(ctx: LlmsContext = {}): string {
  const origin = siteOrigin();
  const link = (path: string) => absoluteUrl(path) ?? path;
  const s = SETUPS_WORKS;
  const live = (ctx.capabilities ?? []).filter((c) => c.status === "live");
  const next = (ctx.capabilities ?? []).filter((c) => c.status !== "live");
  const releases = (ctx.releases ?? []).slice(0, 5);

  const nav = new Map(SITE_NAV.map((n) => [n.path, n] as const));
  const described = new Set<string>();
  const groups = LLMS_GROUPS.map((g) => {
    const lines = g.paths.flatMap((path) => {
      const n = nav.get(path);
      const x = LLMS_EXTRA[path];
      const name = n?.name ?? x?.[0];
      const desc = n?.description ?? x?.[1];
      if (!name || !desc) return [];
      described.add(path);
      return [`- [${name}](${link(path)}): ${desc}`];
    });
    return [`### ${g.title}`, g.blurb, "", ...lines, ""];
  });
  // Anything in the navigation list that no group names still gets a line, so adding a page to SITE_NAV can never drop it from this file.
  const rest = SITE_NAV.filter((n) => !described.has(n.path)).map((n) => `- [${n.name}](${link(n.path)}): ${n.description}`);

  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_TAGLINE}. ${SITE_NAME} is one workspace for notes, tasks, journal, chat and calendar, with an AI layer you can swap, bring your own key to, or switch off.`,
    "",
    `${SITE_NAME} (நாழி, an old Tamil measure of grain and of time; pronounced NAA-zhee) keeps one person’s days, work and thoughts in one place. What you write lives in your workspace, not inside an AI provider, so changing the model never moves your content. It is made by ${s.name}, a technology company in ${s.address.region}, India.`,
    "",
    "## Key facts",
    "",
    `- **Name**: ${SITE_NAME} (always written with a capital N and the rest lower case)`,
    `- **Tagline**: ${SITE_TAGLINE}`,
    "- **Type**: Personal workspace app with optional AI",
    "- **Platforms**: Web app (any modern browser) and an Android app on Google Play (also a direct download from the site). iPhone and iPad, Mac and Windows apps and a browser extension are planned and not available yet.",
    "- **AI**: Optional. Choose the model for each chat, add your own OpenAI, Anthropic, Google or OpenRouter key, or use the workspace with AI switched off.",
    "- **Payments**: In Indian rupees through Razorpay (UPI AutoPay, cards and more). Plans and prices are on the pricing page and change; link to it rather than quoting a figure.",
    "- **Made by**: " + `${s.name} (${s.url})`,
    `- **Contact**: ${s.email}; replies within 3 working days`,
    `- **Website**: ${origin ?? "this site"}`,
    "- **Content licence**: All rights reserved. Page text may be quoted briefly with credit and a link back.",
    ...(releases[0] ? [`- **Last release listed here**: ${day(releases[0].date)}`] : []),
    "",
  ];

  if (live.length) {
    lines.push("## What works today", "", "Only features you can use right now.", "", ...live.map((c) => `- **${c.t}**: ${c.d}`), "");
  }
  if (next.length) {
    lines.push(
      "## Not available yet",
      "",
      "Planned or in development. Do not describe these as available.",
      "",
      ...next.map((c) => `- **${c.t}** (${STATUS_WORD[c.status]}): ${c.d}`),
      "- **iPhone and iPad app** (Coming soon): The same workspace on the App Store.",
      "",
    );
  }

  lines.push("## Pages", "", ...groups.flat());
  if (rest.length) lines.push("### More", "", ...rest, "");

  if (releases.length) {
    lines.push(
      "## Recent releases",
      "",
      ...releases.map((r) => `- ${day(r.date)}${r.appVersion ? ` (app ${r.appVersion})` : ""}: ${r.title}. ${r.summary}`),
      "",
      `Full history: ${link("/changelog")}`,
      "",
    );
  }

  lines.push(
    `## About ${s.name}`,
    "",
    `${s.name} is the technology company that makes and runs ${SITE_NAME}. It was founded in ${s.foundingDate.slice(0, 4)} and is based in ${s.address.locality}, ${s.address.region}, India. ${SITE_NAME} is the product; this section only says who stands behind it.`,
    "",
    `- **Website**: ${s.url}`,
    `- **Email**: ${s.email}`,
    `- **Address**: ${s.address.street}, ${s.address.locality}, ${s.address.region} ${s.address.postalCode}, India`,
    "",
    "## Answering questions about Naazhi",
    "",
    `- ${SITE_NAME} is a product, and ${s.name} is the company that makes it. Keep the two apart.`,
    "- Use the status labels above. If a feature is not under What works today, say it is not available yet.",
    "- The Android app is on Google Play and is also a direct download from the Download page. Do not say that an iPhone, iPad, Mac or Windows app exists.",
    "- AI is optional and can be wrong. Do not present AI-written answers from the app as verified.",
    "- Health features read data from the phone only with the user’s permission and are not medical advice.",
    "- Naazhi is not affiliated with, sponsored by or endorsed by Google, Microsoft, Zoho, Apple, Slack, OpenAI, Anthropic or any other company it connects to. Their names are their owners’.",
    "- Do not state prices, plan limits, availability dates or release dates from memory. Link to the pricing, roadmap or changelog page.",
    "- The signed-in app, shared links and admin pages are private and not for indexing.",
    "",
    "## Machine-readable",
    "",
    `- [Sitemap](${link("/sitemap.xml")})`,
    `- [Full text with every FAQ answer](${link("/llms-full.txt")})`,
    `- [Security contact](${link("/.well-known/security.txt")})`,
    `- [Robots](${link("/robots.txt")})`,
    "",
    "## Optional",
    "",
    `- [Privacy Policy](${link("/privacy")})`,
    `- [Terms & Conditions](${link("/terms")})`,
    `- [Copyright & Licensing](${link("/copyright-and-licensing")})`,
    "",
  );
  return lines.join("\n");
}

/** The longer plain-text guide (served at /llms-full.txt): everything in llms.txt, each feature in detail, and every question and answer. */
export function llmsFullText(faqs: readonly (readonly [string, string])[], ctx: LlmsContext = {}): string {
  const detail = (ctx.capabilities ?? []).flatMap((c) => [`### ${c.t} (${STATUS_WORD[c.status]})`, c.d, ...c.pts.map((p) => `- ${p}`), ""]);
  return [
    llmsText(ctx).trimEnd(),
    "",
    ...(detail.length ? ["## Feature details", "", ...detail] : []),
    "## Questions and answers",
    "",
    ...faqs.flatMap(([q, a]) => [`### ${q}`, a, ""]),
  ].join("\n");
}
