import { describe, expect, it } from "vitest";
import { addMonth, addMonths, estimateTokens, estimatePlans, formatBalance, formatMoney, TOPUP, validTopup, formatTokens, priceLine, tokenCostCents } from "./billing";

describe("billing helpers", () => {
  it("formats money", () => {
    expect(formatMoney(0)).toBe("Free");
    expect(formatMoney(74900)).toBe("₹749");
    expect(formatMoney(74950)).toBe("₹749.50");
    expect(formatMoney(150000)).toBe("₹1,500");
    expect(formatMoney(900, "usd")).toBe("$9");
  });

  it("formats token counts", () => {
    expect(formatTokens(1_000_000)).toBe("1M");
    expect(formatTokens(1_500_000)).toBe("1.5M");
    expect(formatTokens(250_000)).toBe("250K");
    expect(formatTokens(1200)).toBe("1,200");
  });

  it("describes what each plan costs", () => {
    const base = { currency: "inr", interval: "none" as const, token_price_cents_per_million: 0, price_cents: 0 };
    expect(priceLine({ ...base, id: "subscription", price_cents: 74900, interval: "month" })).toBe("₹749 / month");
    expect(priceLine({ ...base, id: "payg", token_price_cents_per_million: 15000 })).toBe("₹150 per 1M tokens");
    expect(priceLine({ ...base, id: "byo" })).toBe("Free");
  });

  it("rounds a usage cost up", () => {
    expect(tokenCostCents(1_000_000, 200)).toBe(200);
    expect(tokenCostCents(1, 200)).toBe(1);
    expect(tokenCostCents(0, 200)).toBe(0);
  });

  it("estimates tokens from characters", () => {
    expect(estimateTokens(0)).toBe(0);
    expect(estimateTokens(9)).toBe(3);
  });

  it("adds a month and clamps to the end of a short month", () => {
    expect(addMonth(new Date("2026-10-26T10:00:00Z")).toISOString()).toBe("2026-11-26T10:00:00.000Z");
    expect(addMonth(new Date("2026-01-31T00:00:00Z")).toISOString()).toBe("2026-02-28T00:00:00.000Z");
    expect(addMonth(new Date("2026-12-15T00:00:00Z")).toISOString()).toBe("2027-01-15T00:00:00.000Z");
    expect(addMonths(new Date("2026-10-26T00:00:00Z"), 12).toISOString()).toBe("2027-10-26T00:00:00.000Z");
  });
});

describe("AI credit", () => {
  it("prices 100 tokens at ₹0.02 on the stated rate of ₹200 per million", () => {
    expect(tokenCostCents(100, 20_000)).toBe(2);
    expect(formatMoney(tokenCostCents(100, 20_000))).toBe("₹0.02");
    expect(tokenCostCents(1_000_000, 20_000)).toBe(20_000);
  });
  it("accepts only whole-rupee top-ups inside the limits", () => {
    expect(validTopup(TOPUP.minCents)).toBe(true);
    expect(validTopup(TOPUP.minCents - 100)).toBe(false);
    expect(validTopup(TOPUP.maxCents)).toBe(true);
    expect(validTopup(TOPUP.maxCents + 100)).toBe(false);
    expect(validTopup(10_050)).toBe(false);
    expect(validTopup(Number.NaN)).toBe(false);
    for (const o of TOPUP.optionsCents) expect(validTopup(o)).toBe(true);
  });
  it("shows a zero balance as ₹0, not Free", () => {
    expect(formatBalance(0)).toBe("₹0");
    expect(formatBalance(-40)).toBe("₹0");
    expect(formatBalance(12_340)).toBe("₹123.40");
  });
});

describe("pricing calculator", () => {
  const plans = [
    { id: "subscription", name: "Subscription", tagline: "", price_cents: 9_900, currency: "inr", interval: "month", included_tokens: 1_000_000, token_price_cents_per_million: 0, features: [], active: true, sort: 1 },
    { id: "payg", name: "Pay as you go", tagline: "", price_cents: 0, currency: "inr", interval: "none", included_tokens: 0, token_price_cents_per_million: 20_000, features: [], active: true, sort: 2 },
    { id: "byo", name: "Bring your own key", tagline: "", price_cents: 0, currency: "inr", interval: "none", included_tokens: 0, token_price_cents_per_million: 0, features: [], active: true, sort: 3 },
  ] as Parameters<typeof estimatePlans>[1];

  it("prices light use on Pay as you go and recommends it over the subscription", () => {
    const r = estimatePlans(100_000, plans); // ₹20
    expect(r.estimates.find((e) => e.id === "payg")?.monthlyCents).toBe(2_000);
    expect(r.estimates.find((e) => e.id === "subscription")).toMatchObject({ monthlyCents: 9_900, covers: true, allowanceUsedPct: 10 });
    expect(r.best).toBe("payg");
  });
  it("recommends the subscription once Pay as you go would cost more", () => {
    expect(estimatePlans(900_000, plans).best).toBe("subscription"); // payg ₹180 vs the ₹99 subscription
  });
  it("flags a subscription that can't cover the use and prices the overflow", () => {
    const sub = estimatePlans(1_500_000, plans).estimates.find((e) => e.id === "subscription")!;
    expect(sub.covers).toBe(false);
    expect(sub.overflowCents).toBe(10_000); // 500k tokens at ₹200 per million
    expect(estimatePlans(1_500_000, plans).best).toBe("payg");
  });
  it("charges nothing for your own key and never recommends it", () => {
    const r = estimatePlans(5_000, plans);
    expect(r.estimates.find((e) => e.id === "byo")?.monthlyCents).toBe(0);
    expect(r.best).not.toBe("byo");
    expect(estimatePlans(0, plans).estimates.find((e) => e.id === "payg")?.monthlyCents).toBe(0);
  });
});
