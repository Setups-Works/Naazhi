import { describe, expect, it } from "vitest";
import { renderEmail } from "../../src/server/email/render";
import { SAMPLES, templates } from "../../src/server/email/templates";

describe("email layout", () => {
  it("draws every template with its heading, a plain-text twin and the brand footer", () => {
    for (const s of SAMPLES) {
      const m = renderEmail(s.content);
      expect(m.subject).toBe(s.content.subject);
      expect(m.html).toContain(s.content.heading.replace(/&/g, "&amp;"));
      expect(m.text).toContain(s.content.heading);
      expect(m.html).toContain("Backed by");
      expect(m.html).toContain("/brand/setups-works.png");
      expect(m.html).toContain('alt="Setups Works"');
      expect(m.text).toContain("Backed by Setups Works.");
      expect(m.html.startsWith("<!doctype html>")).toBe(true);
    }
  });

  it("escapes anything a person wrote, so a name can't inject markup", () => {
    const m = renderEmail(templates.confirmEmail({ name: '<img src=x onerror="alert(1)">', url: "https://naazhi.app/v?a=1&b=2" }));
    expect(m.html).not.toContain("<img src=x");
    expect(m.html).toContain("&lt;img src=x");
    expect(m.html).toContain("a=1&amp;b=2");
  });
});

describe("invoice email", () => {
  const inv = { number: "NZ-2026-000123", description: "Subscription, monthly", amountCents: 74_900, currency: "inr", issuedAt: "2026-11-11T09:30:00Z", periodStart: "2026-11-11T09:30:00Z", periodEnd: "2026-12-11T09:30:00Z" };
  it("shows the invoice number, the amount in rupees, the period and a link", () => {
    const m = renderEmail(templates.invoice({ name: "Asha Kumar", url: "https://naazhi.app/invoice/x", invoice: inv }));
    expect(m.subject).toContain("NZ-2026-000123");
    expect(m.html).toContain("₹749");
    expect(m.text).toContain("Total paid: ₹749");
    expect(m.text).toContain("Covers:");
    expect(m.html).toContain("https://naazhi.app/invoice/x");
    expect(m.html).toContain("Thank you, Asha.");
  });
  it("leaves the period out for a credit top-up", () => {
    const m = renderEmail(templates.invoice({ url: "https://naazhi.app/invoice/x", invoice: { ...inv, description: "AI credit top-up", amountCents: 25_000, periodStart: null, periodEnd: null } }));
    expect(m.text).not.toContain("Covers:");
    expect(m.text).toContain("₹250");
  });
});

describe("shared journal invitation email", () => {
  const base = { from: "Ravi", journal: "Our trip", role: "editor" as const, url: "https://dashboard.naazhi.app/journal/collaborate" };
  it("for someone with an account links to the invitations and mentions the app", () => {
    const m = renderEmail(templates.journalInvite(base));
    expect(m.text).toContain("Open it in the Naazhi app");
    expect(m.text).toContain(base.url);
    expect(m.html).toContain("View invitation");
  });
  it("for an address with no account says to create one first", () => {
    const m = renderEmail(templates.journalInvite({ ...base, url: "https://dashboard.naazhi.app/signup?next=%2Fjournal%2Fcollaborate", needsAccount: true }));
    expect(m.text).toContain("Create a free Naazhi account with this email address");
    expect(m.html).toContain("Create your account");
    expect(m.text).not.toContain("Open it in the Naazhi app");
  });
});
