import { describe, expect, it } from "vitest";
import type { BillingPlan } from "@untitled/types";
import { defaultTopup, localizePlan, plansFor, topupRange, TOPUP_USD, addMonth, addMonths, estimateTokens, estimatePlans, formatBalance, formatMoney, TOPUP, validTopup, formatTokens, priceLine, tokenCostCents, trialLine, trialButtonLabel, normalizePhone } from "./billing";

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
    { id: "subscription", name: "Subscription", tagline: "", price_cents: 9_900, currency: "inr", interval: "month", included_tokens: 1_000_000, token_price_cents_per_million: 0, features: [], active: true, sort: 1, trial_days: 0, price_cents_usd: 900, token_price_cents_per_million_usd: 0 },
    { id: "payg", name: "Pay as you go", tagline: "", price_cents: 0, currency: "inr", interval: "none", included_tokens: 0, token_price_cents_per_million: 20_000, features: [], active: true, sort: 2, trial_days: 0, price_cents_usd: 0, token_price_cents_per_million_usd: 240 },
    { id: "byo", name: "Bring your own key", tagline: "", price_cents: 0, currency: "inr", interval: "none", included_tokens: 0, token_price_cents_per_million: 0, features: [], active: true, sort: 3, trial_days: 0, price_cents_usd: 0, token_price_cents_per_million_usd: 0 },
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

describe("free trial wording", () => {
  const sub = { id: "subscription", price_cents: 74_900, currency: "inr", interval: "month", token_price_cents_per_million: 0, trial_days: 7 } as const;
  it("says how long it is free and what it costs after", () => {
    expect(trialLine(sub)).toBe("7 days free, then ₹749 / month");
    expect(trialLine({ ...sub, trial_days: 1 })).toBe("1 day free, then ₹749 / month");
  });
  it("shows just the price when there is no trial or it was already used", () => {
    expect(trialLine({ ...sub, trial_days: 0 })).toBe("₹749 / month");
    expect(trialLine(sub, false)).toBe("₹749 / month");
    expect(trialLine({ ...sub, id: "payg", token_price_cents_per_million: 20_000 })).toBe("₹200 per 1M tokens");
  });
  it("labels the button only while a trial applies", () => {
    expect(trialButtonLabel(sub, true)).toBe("Start 7-day free trial");
    expect(trialButtonLabel(sub, false)).toBeNull();
    expect(trialButtonLabel({ trial_days: 0 }, true)).toBeNull();
  });
});

describe("normalizePhone", () => {
  it("turns an Indian mobile number into international form however it is typed", () => {
    for (const v of ["9876543210", "98765 43210", "098765 43210", "91 98765-43210", "+91 98765 43210", "(+91) 98765 43210"]) expect(normalizePhone(v)).toBe("+919876543210");
  });
  it("keeps a valid international number", () => {
    expect(normalizePhone("+1 415 555 0132")).toBe("+14155550132");
    expect(normalizePhone("+44 7911 123456")).toBe("+447911123456");
  });
  it("refuses anything that is not a number", () => {
    for (const v of ["", "  ", "abc", "12345", "5876543210", "+0 123456789", "+1234", "9876543210123456", "98765 4321"]) expect(normalizePhone(v)).toBeNull();
  });
});

describe("prices by currency", () => {
  const mk = (o: Partial<BillingPlan> & Pick<BillingPlan, "id">): BillingPlan => ({
    name: o.id, tagline: "", price_cents: 0, currency: "inr", interval: "none", included_tokens: 0, token_price_cents_per_million: 0,
    price_cents_usd: 0, token_price_cents_per_million_usd: 0, features: [], active: true, sort: 1, trial_days: 0, ...o,
  });
  const sub = mk({ id: "subscription", price_cents: 74_900, interval: "month", included_tokens: 1_000_000, price_cents_usd: 900, trial_days: 7 });
  const payg = mk({ id: "payg", token_price_cents_per_million: 20_000, token_price_cents_per_million_usd: 240 });
  const byo = mk({ id: "byo" });

  it("shows the rupee prices to people paying in rupees", () => {
    const p = localizePlan(sub, "inr");
    expect(p).toMatchObject({ currency: "inr", price_cents: 74_900 });
    expect(priceLine(p)).toBe("₹749 / month");
  });
  it("swaps in the dollar prices for people paying in dollars", () => {
    const p = localizePlan(sub, "usd");
    expect(p).toMatchObject({ currency: "usd", price_cents: 900 });
    expect(priceLine(p)).toBe("$9 / month");
    expect(trialLine(p)).toBe("7 days free, then $9 / month");
    expect(priceLine(localizePlan(payg, "usd"))).toBe("$2.40 per 1M tokens");
  });
  it("leaves out a plan that charges in rupees but has no dollar price yet, and keeps the free one", () => {
    const noUsd = { ...sub, price_cents_usd: 0 };
    expect(plansFor([noUsd, payg, byo], "usd").map((p) => p.id)).toEqual(["payg", "byo"]);
    expect(plansFor([noUsd, payg, byo], "inr").map((p) => p.id)).toEqual(["subscription", "payg", "byo"]);
    expect(plansFor([sub, { ...payg, token_price_cents_per_million_usd: 0 }, byo], "usd").map((p) => p.id)).toEqual(["subscription", "byo"]);
  });
  it("does not change the stored plan", () => {
    localizePlan(sub, "usd");
    expect(sub.price_cents).toBe(74_900);
  });
  it("has its own top-up defaults and range in dollars", () => {
    expect(defaultTopup("usd")).toEqual(TOPUP_USD);
    expect(defaultTopup("inr").minCents).toBe(TOPUP.minCents);
    expect(topupRange(TOPUP_USD, "usd")).toBe("$5 to $500");
    expect(validTopup(500, TOPUP_USD)).toBe(true);
    expect(validTopup(450, TOPUP_USD)).toBe(false);
    expect(validTopup(50_100, TOPUP_USD)).toBe(false);
  });
});
