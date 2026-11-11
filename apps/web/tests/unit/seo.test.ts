import { describe, expect, it } from "vitest";
import { llmsText, PUBLIC_PAGES, SITE_NAV } from "../../src/lib/seo";

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
});
