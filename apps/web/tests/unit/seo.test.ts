import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FAQS } from "../../src/components/site/content";
import { FAQ_GROUPS, faqSlug } from "../../src/components/site/faqGroups";
import { FEATURE_ORDER, FEATURE_PAGES } from "../../src/lib/featurePages";
import { FOOTER_COLS, MEGA, MEGA_DEFAULT_SHOT } from "../../src/lib/site";
import { faqSchema, llmsFullText, llmsText, pageMeta, PUBLIC_PAGES, SITE_NAV } from "../../src/lib/seo";

describe("seo", () => {
  it("lists every navigation page in the public page list, so sitelink candidates are also in the sitemap", () => {
    const known = new Set(PUBLIC_PAGES.map((p) => p.path));
    for (const n of SITE_NAV) expect(known.has(n.path), n.path).toBe(true);
  });

  it("gives every navigation entry a short name and a one-line description", () => {
    for (const n of SITE_NAV) {
      expect(n.name.length).toBeGreaterThan(2);
      expect(n.name.length).toBeLessThanOrEqual(24);
      expect(n.description.length).toBeGreaterThan(10);
      expect(n.description.length).toBeLessThanOrEqual(120);
    }
  });

  it("writes llms.txt with the name, a summary and a link per page", () => {
    const text = llmsText();
    expect(text.startsWith("# Naazhi")).toBe(true);
    for (const n of SITE_NAV) expect(text).toContain(`[${n.name}]`);
  });

  it("has a /faq page in the sitemap list and the navigation", () => {
    expect(PUBLIC_PAGES.some((p) => p.path === "/faq")).toBe(true);
    expect(SITE_NAV.some((n) => n.path === "/faq")).toBe(true);
  });

  it("states one language and a canonical address on every page", () => {
    const m = pageMeta({ title: "T", description: "D", path: "/faq" });
    expect(m.alternates?.canonical).toBe("/faq");
    expect(m.alternates?.languages).toEqual({ en: "/faq", "x-default": "/faq" });
  });
});

describe("faq", () => {
  it("puts every question in exactly one section of the FAQ page", () => {
    const shown = FAQ_GROUPS.flatMap((g) => g.items.map(([q]) => q));
    expect([...shown].sort()).toEqual(FAQS.map(([q]) => q).sort());
    expect(new Set(shown).size).toBe(shown.length);
  });

  it("gives every question its own address, unique and URL-safe", () => {
    const slugs = FAQS.map(([q]) => faqSlug(q));
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(faqSlug("Do I have to use AI?")).toBe("do-i-have-to-use-ai");
  });

  it("writes schema.org FAQPage markup with the same questions that are shown", () => {
    const json = faqSchema(FAQS) as { "@type": string; mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    expect(json["@type"]).toBe("FAQPage");
    expect(json.mainEntity.map((e) => e.name)).toEqual(FAQS.map(([q]) => q));
    expect(json.mainEntity.every((e) => e.acceptedAnswer.text.length > 20)).toBe(true);
  });

  it("lists every question and answer in llms-full.txt", () => {
    const text = llmsFullText(FAQS);
    for (const [q, a] of FAQS) {
      expect(text).toContain(`### ${q}`);
      expect(text).toContain(a);
    }
    expect(text.startsWith("# Naazhi")).toBe(true);
  });
});

describe("feature pages", () => {
  it("are in the sitemap list and the navigation, each at its own address", () => {
    for (const slug of FEATURE_ORDER) {
      const p = FEATURE_PAGES[slug];
      expect(p.path).toBe(`/features/${slug}`);
      expect(
        PUBLIC_PAGES.some((x) => x.path === p.path),
        p.path,
      ).toBe(true);
      expect(
        SITE_NAV.some((x) => x.path === p.path),
        p.path,
      ).toBe(true);
    }
    expect(PUBLIC_PAGES.some((x) => x.path === "/integrations")).toBe(true);
  });

  it("stay clear of the dashboard's own addresses (/notes, /journal on the app host)", () => {
    for (const slug of FEATURE_ORDER) expect(FEATURE_PAGES[slug].path.startsWith("/features/")).toBe(true);
  });

  it("have a title, a description in search-result length, real copy and questions with answers", () => {
    for (const slug of FEATURE_ORDER) {
      const p = FEATURE_PAGES[slug];
      expect(p.seo.title.length).toBeLessThanOrEqual(60);
      expect(p.seo.description.length).toBeGreaterThan(60);
      expect(p.seo.description.length).toBeLessThanOrEqual(200);
      expect(p.points.length).toBeGreaterThanOrEqual(4);
      expect(p.showcase).toHaveLength(2);
      for (const [q, a] of p.faq) expect(q.length > 8 && a.length > 20).toBe(true);
      expect(new Set(p.faq.map(([q]) => faqSlug(q))).size).toBe(p.faq.length);
      expect(p.related.every((r) => r !== slug && FEATURE_PAGES[r])).toBe(true);
    }
  });

  it("are linked from the footer", () => {
    const hrefs = FOOTER_COLS.flatMap((c) => c.links.map(([, h]) => h));
    for (const h of ["/features/notes", "/features/tasks", "/features/journal", "/integrations", "/faq"]) expect(hrefs).toContain(h);
  });
});

describe("mega menu", () => {
  it("only shows app screens that exist, and links only to pages that exist in the sitemap or the home page sections", () => {
    const items = [...MEGA.workspace, ...MEGA.featured];
    for (const src of [MEGA_DEFAULT_SHOT, ...items.flatMap((i) => (i.shot ? [i.shot] : []))]) {
      expect(existsSync(join(process.cwd(), "public", src)), src).toBe(true);
    }
    const known = new Set(PUBLIC_PAGES.map((p) => p.path));
    for (const i of items) expect(known.has(i.href) || i.href.startsWith("/#"), i.href).toBe(true);
  });
});
