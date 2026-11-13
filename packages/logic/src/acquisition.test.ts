import { describe, expect, it } from "vitest";
import { parseAttribution, sanitizeAttribution, sourceFromHost, trackedLink } from "./acquisition";

describe("parseAttribution", () => {
  it("reads utm tags and cleans them", () => {
    expect(parseAttribution({ query: "?utm_source=Instagram&utm_medium=Social&utm_campaign=Launch Week" })).toEqual({
      source: "instagram",
      medium: "social",
      campaign: "launch-week",
      referrerHost: "",
    });
  });
  it("accepts ?ref= and an install referrer string", () => {
    expect(parseAttribution({ query: "ref=reddit" })?.source).toBe("reddit");
    expect(parseAttribution({ query: "utm_source=x&utm_medium=social" })).toMatchObject({ source: "x", medium: "social" });
  });
  it("names the sender when there are no tags", () => {
    expect(parseAttribution({ referrer: "https://l.instagram.com/?u=abc" })).toMatchObject({ source: "instagram", medium: "referral" });
    expect(parseAttribution({ referrer: "https://www.google.co.in/" })).toMatchObject({ source: "google", medium: "organic" });
    expect(parseAttribution({ referrer: "https://t.co/xyz" })?.source).toBe("x");
    expect(parseAttribution({ referrer: "https://news.ycombinator.com/item?id=1" })?.source).toBe("news.ycombinator.com");
  });
  it("ignores Naazhi's own pages and plain visits", () => {
    expect(parseAttribution({ referrer: "https://naazhi.app/pricing", ownHosts: ["naazhi.app"] })).toBeNull();
    expect(parseAttribution({ referrer: "https://dashboard.naazhi.app/", ownHosts: ["naazhi.app"] })).toBeNull();
    expect(parseAttribution({})).toBeNull();
  });
  it("prefers the tag over the referrer", () => {
    expect(parseAttribution({ query: "utm_source=newsletter", referrer: "https://mail.google.com/" })).toMatchObject({ source: "newsletter", referrerHost: "mail.google.com" });
  });
});

describe("sanitizeAttribution", () => {
  it("never trusts what a cookie says", () => {
    expect(sanitizeAttribution({ source: "<script>alert(1)</script>", medium: "A".repeat(200) }).source).toBe("script-alert-1-script");
    expect(sanitizeAttribution({ source: "  " }).source).toBe("direct");
    expect(sanitizeAttribution(null).source).toBe("direct");
    expect(sanitizeAttribution({ source: "x", medium: "a".repeat(200) }).medium).toHaveLength(60);
  });
});

describe("trackedLink and sourceFromHost", () => {
  it("builds a website link and a Google Play link", () => {
    expect(trackedLink("https://naazhi.app/", { source: "Instagram", medium: "social", campaign: "launch" })).toBe(
      "https://naazhi.app/?utm_source=instagram&utm_medium=social&utm_campaign=launch",
    );
    const play = trackedLink("https://play.google.com/store/apps/details?id=com.setupsworks.naazhi", { source: "x", medium: "social" }, "play");
    expect(new URL(play).searchParams.get("referrer")).toBe("utm_source=x&utm_medium=social");
    expect(new URL(play).searchParams.get("id")).toBe("com.setupsworks.naazhi");
  });
  it("maps known hosts", () => {
    expect(sourceFromHost("www.youtube.com")).toBe("youtube");
    expect(sourceFromHost("lnkd.in")).toBe("linkedin");
  });
});
