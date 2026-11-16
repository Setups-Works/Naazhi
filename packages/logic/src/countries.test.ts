import { describe, expect, it } from "vitest";
import { COUNTRIES, billingRegion, cleanCountry, countryFromHeaders, countryName, currencyForCountry, providerForCountry, regionForProvider } from "./countries";

describe("country → currency and payment provider", () => {
  it("bills India in rupees through Razorpay", () => {
    expect(billingRegion("IN")).toEqual({ currency: "inr", provider: "razorpay" });
    expect(billingRegion("in")).toEqual({ currency: "inr", provider: "razorpay" });
    expect(billingRegion(" In ")).toEqual({ currency: "inr", provider: "razorpay" });
  });
  it("bills every other country in dollars through Stripe", () => {
    for (const c of ["US", "GB", "DE", "AE", "SG", "BR", "AU", "PK", "LK"]) expect(billingRegion(c)).toEqual({ currency: "usd", provider: "stripe" });
    expect(currencyForCountry("CA")).toBe("usd");
    expect(providerForCountry("JP")).toBe("stripe");
  });
  it("treats nobody-who-chose-yet as India, the way every older account has been billed", () => {
    for (const c of [null, undefined, "", "ZZ", "India", "XX", "1"]) expect(billingRegion(c)).toEqual({ currency: "inr", provider: "razorpay" });
  });
  it("keeps a person with a paid plan on the provider that bills it", () => {
    expect(regionForProvider("stripe").currency).toBe("usd");
    expect(regionForProvider("razorpay").currency).toBe("inr");
  });
});

describe("country list", () => {
  it("has unique upper-case ISO codes, sorted by name, and India in it", () => {
    const codes = COUNTRIES.map(([c]) => c);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((c) => /^[A-Z]{2}$/.test(c))).toBe(true);
    expect(codes).toContain("IN");
    expect(codes).toContain("US");
    expect(codes.length).toBeGreaterThan(240);
    const names = COUNTRIES.map(([, n]) => n);
    expect(names.slice(0, 3)).toEqual(["Afghanistan", "Åland Islands", "Albania"]);
  });
  it("cleans a code and refuses what isn't one", () => {
    expect(cleanCountry("us")).toBe("US");
    expect(cleanCountry("USA")).toBeNull();
    expect(cleanCountry(5)).toBeNull();
    expect(countryName("in")).toBe("India");
    expect(countryName(null)).toBeNull();
  });
  it("reads a visitor's country from a CDN header, first match wins", () => {
    const h = (o: Record<string, string>) => (n: string) => o[n] ?? null;
    expect(countryFromHeaders(h({ "cf-ipcountry": "de" }))).toBe("DE");
    expect(countryFromHeaders(h({ "x-vercel-ip-country": "IN", "cf-ipcountry": "US" }))).toBe("IN");
    expect(countryFromHeaders(h({ "cf-ipcountry": "XX" }))).toBeNull();
    expect(countryFromHeaders(h({}))).toBeNull();
  });
});
