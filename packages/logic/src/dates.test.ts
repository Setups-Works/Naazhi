import { describe, expect, it } from "vitest";
import { ago, toDate } from "./dates";

describe("toDate", () => {
  const moment = Date.UTC(2026, 10, 10, 7, 50, 43, 123);

  it("reads ISO-8601 and Postgres' own text form as the same moment", () => {
    expect(toDate("2026-11-10T07:50:43.123Z").getTime()).toBe(moment);
    expect(toDate("2026-11-10 07:50:43.123+00").getTime()).toBe(moment);
    expect(toDate("2026-11-10 07:50:43.123456+00").getTime()).toBe(moment);
    expect(toDate("2026-11-10 13:20:43.123+05:30").getTime()).toBe(moment);
    expect(toDate("2026-11-10 13:20:43.123+0530").getTime()).toBe(moment);
  });

  it("leaves a plain day alone", () => {
    expect(toDate("2026-11-10").getTime()).toBe(Date.UTC(2026, 10, 10));
  });

  it("gives an invalid date for nonsense instead of throwing", () => {
    expect(Number.isNaN(toDate("not a date").getTime())).toBe(true);
  });
});

describe("ago", () => {
  it("says nothing rather than 'Invalid Date' for a value it cannot read", () => {
    expect(ago("not a date")).toBe("");
  });

  it("reads Postgres' text form", () => {
    const stamp = new Date(Date.now() - 5 * 60_000).toISOString().replace("T", " ").replace("Z", "+00");
    expect(ago(stamp)).toBe("5m ago");
  });
});
