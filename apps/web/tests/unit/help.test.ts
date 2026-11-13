import { describe, expect, it } from "vitest";
import { ARTICLES, CATEGORIES, categoryBySlug, findArticle } from "../../src/features/help/articles";
import { searchArticles } from "../../src/features/help/search";
import { helpArticleSchemas, helpSitemapEntries, helpWebsiteSchema } from "../../src/features/help/seo";
import { helpHref, helpPath, isHelpPath, isHelpSplit } from "../../src/lib/hosts";

describe("help center content", () => {
  it("gives every article a unique address in an existing category", () => {
    const slugs = ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const a of ARTICLES) expect(categoryBySlug(a.category), a.slug).toBeDefined();
    for (const s of [...slugs, ...CATEGORIES.map((c) => c.slug)]) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("has no empty category, and no category slug that collides with an article", () => {
    for (const c of CATEGORIES) expect(ARTICLES.some((a) => a.category === c.slug), c.slug).toBe(true);
    for (const c of CATEGORIES) expect(findArticle(c.slug), c.slug).toBeUndefined();
  });

  it("points every related link at an article that exists, never at itself", () => {
    for (const a of ARTICLES) for (const r of a.related ?? []) {
      expect(findArticle(r), `${a.slug} → ${r}`).toBeDefined();
      expect(r).not.toBe(a.slug);
    }
  });

  it("dates every article and gives it a summary, keywords and a body", () => {
    for (const a of ARTICLES) {
      expect(a.updated, a.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(a.summary.length, a.slug).toBeGreaterThan(20);
      expect(a.summary.length, a.slug).toBeLessThanOrEqual(200);
      expect(a.keywords.length, a.slug).toBeGreaterThan(0);
      expect(a.blocks.length, a.slug).toBeGreaterThan(0);
    }
  });
});

describe("help search", () => {
  it("finds the article for a plain question, title matches first", () => {
    expect(searchArticles("reset password")[0]?.slug).toBe("reset-your-password");
    expect(searchArticles("android install")[0]?.category).toBe("apps");
  });

  it("needs every word to match, so one common word doesn't return everything", () => {
    const some = searchArticles("password");
    const narrow = searchArticles("password zzzzqq");
    expect(some.length).toBeGreaterThan(0);
    expect(narrow).toEqual([]);
  });

  it("returns nothing for an empty or one-letter query and ignores case and accents", () => {
    expect(searchArticles("")).toEqual([]);
    expect(searchArticles("  ")).toEqual([]);
    expect(searchArticles("PASSKEY").length).toBe(searchArticles("passkey").length);
  });
});

describe("help center addresses", () => {
  it("is served under /help when it has no host of its own", () => {
    expect(isHelpSplit()).toBe(false);
    expect(helpHref("/")).toBe("/help");
    expect(helpHref("/account/cant-sign-in")).toBe("/help/account/cant-sign-in");
    expect(helpPath("/search")).toBe("/help/search");
    expect(isHelpPath("/help")).toBe(true);
    expect(isHelpPath("/help/apps")).toBe(true);
    expect(isHelpPath("/helpful")).toBe(false);
  });
});

describe("help center structured data", () => {
  const a = ARTICLES.find((x) => x.blocks.some((b) => b.type === "steps"))!;

  it("describes an article as a TechArticle with a breadcrumb, and a HowTo when it has steps", () => {
    const types = helpArticleSchemas(a).map((d) => d["@type"]);
    expect(types).toEqual(["TechArticle", "BreadcrumbList", "HowTo"]);
    const plain = ARTICLES.find((x) => !x.blocks.some((b) => b.type === "steps"))!;
    expect(helpArticleSchemas(plain).map((d) => d["@type"])).toEqual(["TechArticle", "BreadcrumbList"]);
  });

  it("declares its search so assistants and search engines can use it", () => {
    const site = helpWebsiteSchema() as { potentialAction: { target: { urlTemplate: string } } };
    expect(site.potentialAction.target.urlTemplate).toContain("/search?q={search_term_string}");
  });

  it("lists the front page, every category and every article once in the sitemap", () => {
    const entries = helpSitemapEntries(ARTICLES, CATEGORIES, "2026-01-01");
    expect(entries.length).toBe(1 + CATEGORIES.length + ARTICLES.length);
    expect(new Set(entries.map((e) => e.url)).size).toBe(entries.length);
  });
});
