import { describe, expect, it } from "vitest";
import { crawlerOf, isCountedPath } from "../../src/lib/crawlers";

const GOOGLEBOT = "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

describe("crawlerOf", () => {
  it("names the well-known crawlers by kind", () => {
    expect(crawlerOf(GOOGLEBOT)).toEqual({ bot: "Googlebot", kind: "search" });
    expect(crawlerOf("Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)")?.bot).toBe("Bingbot");
    expect(crawlerOf("Mozilla/5.0 AppleWebKit/537.36; compatible; GPTBot/1.2; +https://openai.com/gptbot")).toEqual({ bot: "GPTBot", kind: "ai" });
    expect(crawlerOf("Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)")).toEqual({ bot: "Claude", kind: "ai" });
    expect(crawlerOf("facebookexternalhit/1.1")).toEqual({ bot: "Facebook", kind: "social" });
  });
  it("puts a specific name before a general one", () => {
    expect(crawlerOf("Mozilla/5.0 (compatible; Googlebot-Image/1.0)")?.bot).toBe("Googlebot Image");
    expect(crawlerOf("Applebot-Extended/0.1")?.kind).toBe("ai");
  });
  it("calls an unknown bot Other bot, and a browser nothing", () => {
    expect(crawlerOf("SomeNewCrawler/1.0 (+https://example.com/bot)")).toEqual({ bot: "Other bot", kind: "other" });
    expect(crawlerOf(CHROME)).toBeNull();
    expect(crawlerOf(null)).toBeNull();
    expect(crawlerOf("")).toBeNull();
  });
});

describe("isCountedPath", () => {
  it("counts public pages and crawler files, never the app or the API", () => {
    for (const p of ["/", "/pricing", "/robots.txt", "/sitemap.xml", "/help/x"]) expect(isCountedPath(p)).toBe(true);
    for (const p of ["/dashboard/todo", "/admin/users", "/api/v1/x", "/login", "/share/abc"]) expect(isCountedPath(p)).toBe(false);
  });
});
