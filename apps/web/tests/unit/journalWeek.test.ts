import { describe, expect, it } from "vitest";
import { journalWeek } from "../../src/features/home/journalWeek";

const T = "2026-11-17";

describe("journalWeek (Home's journal strip)", () => {
  it("lists the seven days ending today, oldest first", () => {
    const { days } = journalWeek([], T);
    expect(days.map((d) => d.date)).toEqual(["2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17"]);
    expect(days.filter((d) => d.today).map((d) => d.date)).toEqual([T]);
  });
  it("marks the days with an entry", () =>
    expect(journalWeek(["2026-11-15", "2026-11-17", "2026-10-01"], T).days.filter((d) => d.wrote).map((d) => d.date)).toEqual(["2026-11-15", "2026-11-17"]));
  it("counts the streak back from today", () => expect(journalWeek(["2026-11-17", "2026-11-16", "2026-11-15", "2026-11-13"], T).streak).toBe(3));
  it("keeps yesterday's streak alive before you write today", () => expect(journalWeek(["2026-11-16", "2026-11-15"], T).streak).toBe(2));
  it("is zero after a missed day", () => expect(journalWeek(["2026-11-15"], T).streak).toBe(0));
  it("crosses a month boundary", () => expect(journalWeek(["2026-12-01", "2026-11-30"], "2026-12-01").streak).toBe(2));
});
