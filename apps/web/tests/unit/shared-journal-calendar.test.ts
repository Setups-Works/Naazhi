import { describe, expect, it } from "vitest";
import { monthGrid, parseDay, shiftMonth, streakOf } from "../../src/features/collaboration/lib/calendar";

describe("shared journal calendar helpers", () => {
  it("moves a month by whole months across years", () => {
    expect(shiftMonth("2026-11", 1)).toBe("2026-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("lays a month out as whole Monday-first weeks with the neighbours' days at the edges", () => {
    const g = monthGrid("2026-11"); // 1 November 2026 is a Sunday
    expect(g.length % 7).toBe(0);
    expect(g[0]).toBe("2026-10-26");
    expect(g[6]).toBe("2026-11-01");
    expect(g).toContain("2026-11-30");
    expect(parseDay(g[0]!).getDay()).toBe(1);
  });

  it("counts the streak back from today, and keeps yesterday's while today is empty", () => {
    const counts = { "2026-11-10": 1, "2026-11-11": 2, "2026-11-12": 1 };
    expect(streakOf(counts, "2026-11-12")).toBe(3);
    expect(streakOf({ "2026-11-10": 1, "2026-11-11": 2 }, "2026-11-12")).toBe(2);
    expect(streakOf({ "2026-11-09": 1 }, "2026-11-12")).toBe(0);
  });
});
