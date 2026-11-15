import { beforeAll, describe, expect, it } from "vitest";
import { cleanHtml, personalise, renderCampaign, toText, unsubscribeQuery, verifyUnsubscribe } from "../../src/server/email/campaign";
import { draftInput } from "../../src/server/services/campaigns/campaigns.schema";

beforeAll(() => {
  process.env.BETTER_AUTH_SECRET = "test-secret-test-secret-test-secret";
});

describe("campaign html", () => {
  it("drops scripts, event handlers, forms and javascript links but keeps formatting", () => {
    const out = cleanHtml('<h2 onclick="x()">Hi</h2><script>alert(1)</script><form><input></form><a href="javascript:alert(1)">bad</a><a href="https://naazhi.app">ok</a><p style="color:#fff;position:fixed">t</p>');
    expect(out).toContain("<h2>Hi</h2>");
    expect(out).not.toMatch(/script|onclick|<form|<input|javascript:|position/);
    expect(out).toContain('href="https://naazhi.app"');
    expect(out).toContain("color:#fff");
  });

  it("fills {{name}} with the escaped first name, or 'there'", () => {
    expect(personalise("Hello {{name}}!", "Asha Rao")).toBe("Hello Asha!");
    expect(personalise("Hello {{ name }}!", "")).toBe("Hello there!");
    expect(personalise("{{name}}", "<b>x</b>")).toBe("&lt;b&gt;x&lt;/b&gt;");
  });

  it("makes a readable plain-text twin with the links written out", () => {
    const t = toText('<p>One <a href="https://naazhi.app">site</a></p><p>Two<br>lines</p>');
    expect(t).toContain("One site (https://naazhi.app)");
    expect(t).toContain("Two\nlines");
  });

  it("a newsletter carries the unsubscribe link; a direct email does not", () => {
    const n = renderCampaign({ html: "<p>Hi</p>", unsubscribeUrl: "https://naazhi.app/unsubscribe?e=x" });
    expect(n.html).toContain("Unsubscribe");
    expect(n.text).toContain("Unsubscribe: https://naazhi.app/unsubscribe?e=x");
    expect(renderCampaign({ html: "<p>Hi</p>" }).html).not.toContain("Unsubscribe");
  });
});

describe("unsubscribe links", () => {
  it("accept their own address and nothing else", () => {
    const q = new URLSearchParams(unsubscribeQuery("Asha@Example.com"));
    expect(verifyUnsubscribe(q.get("e"), q.get("t"))).toBe("asha@example.com");
    const other = new URLSearchParams(unsubscribeQuery("someone@else.com"));
    expect(verifyUnsubscribe(q.get("e"), other.get("t"))).toBeNull();
    expect(verifyUnsubscribe(q.get("e"), "nope")).toBeNull();
    expect(verifyUnsubscribe(null, null)).toBeNull();
  });
});

describe("campaign input", () => {
  const ok = { subject: "Hi", html: "<p>x</p>", kind: "newsletter", audience: "all", picked: [] };
  it("accepts a newsletter to everyone and a direct email to picked people", () => {
    expect(draftInput.safeParse(ok).success).toBe(true);
    expect(draftInput.safeParse({ ...ok, kind: "direct", audience: "picked", picked: ["3f1c2a4e-9b7d-4e2a-8f10-1a2b3c4d5e6f"] }).success).toBe(true);
  });
  it("refuses a direct email to everyone, picked with no one, and a missing subject", () => {
    expect(draftInput.safeParse({ ...ok, kind: "direct" }).success).toBe(false);
    expect(draftInput.safeParse({ ...ok, audience: "picked" }).success).toBe(false);
    expect(draftInput.safeParse({ ...ok, subject: " " }).success).toBe(false);
  });
});
