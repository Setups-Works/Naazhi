import { describe, expect, it } from "vitest";
import { REVIEW_RULES, emptyReviewState, markReviewAsked, noteMoment, noteSession, parseReviewState, playReviewsUrl, shouldAskForReview, type ReviewState } from "./reviewPrompt";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 10, 1);

/** Someone who opened the app on `visits` separate days starting at T0, and earned `points`. */
function user(visits: number, points: number): ReviewState {
  let s = emptyReviewState();
  for (let i = 0; i < visits; i++) s = noteSession(s, T0 + i * DAY);
  return { ...s, points };
}

describe("review prompt timing", () => {
  it("never asks a new person, however busy", () => {
    expect(shouldAskForReview(user(1, 100), T0 + DAY / 2)).toBe(false);
    // Enough visits and points, but not enough days since the first open.
    const s = { ...emptyReviewState(), firstOpenAt: T0, sessions: 10, points: 100 };
    expect(shouldAskForReview(s, T0 + 2 * DAY)).toBe(false);
  });

  it("asks once they have come back enough and had enough good moments", () => {
    const s = user(REVIEW_RULES.minSessions, REVIEW_RULES.pointSteps[0]!);
    expect(shouldAskForReview(s, T0 + 6 * DAY)).toBe(true);
    expect(shouldAskForReview({ ...s, points: REVIEW_RULES.pointSteps[0]! - 1 }, T0 + 6 * DAY)).toBe(false);
    expect(shouldAskForReview(user(REVIEW_RULES.minSessions - 1, 100), T0 + 6 * DAY)).toBe(false);
  });

  it("counts opens close together as one visit", () => {
    let s = noteSession(emptyReviewState(), T0);
    s = noteSession(s, T0 + 5 * 60_000);
    s = noteSession(s, T0 + 10 * 60_000);
    expect(s.sessions).toBe(1);
    s = noteSession(s, T0 + 2 * 3_600_000);
    expect(s.sessions).toBe(2);
    expect(s.firstOpenAt).toBe(T0);
  });

  it("weighs a journal entry or a streak more than a task", () => {
    let s = emptyReviewState();
    s = noteMoment(noteMoment(noteMoment(s, "task_done"), "journal_saved"), "streak");
    expect(s.points).toBe(1 + 2 + 3);
  });

  it("waits months and needs more good moments before asking again, then stops", () => {
    const now = T0 + 10 * DAY;
    let s = markReviewAsked(user(10, REVIEW_RULES.pointSteps[0]!), now);
    // Plenty of new points, but inside the cooldown.
    s = { ...s, points: s.points + 1000 };
    expect(shouldAskForReview(s, now + 30 * DAY)).toBe(false);
    // After the cooldown, the second ask needs the second step's worth of new points.
    const later = now + (REVIEW_RULES.cooldownDays + 1) * DAY;
    expect(shouldAskForReview({ ...s, points: s.pointsAtLastAsk + REVIEW_RULES.pointSteps[1]! - 1 }, later)).toBe(false);
    expect(shouldAskForReview({ ...s, points: s.pointsAtLastAsk + REVIEW_RULES.pointSteps[1]! }, later)).toBe(true);
    // Never more than the limit.
    expect(shouldAskForReview({ ...s, asks: REVIEW_RULES.maxAsks }, later)).toBe(false);
  });

  it("reads a stored state safely", () => {
    expect(parseReviewState(null)).toEqual(emptyReviewState());
    expect(parseReviewState("x")).toEqual(emptyReviewState());
    expect(parseReviewState({ sessions: -3, points: "9", firstOpenAt: T0, asks: 1 })).toEqual({ ...emptyReviewState(), firstOpenAt: T0, asks: 1 });
  });

  it("links a button to the Play listing's reviews", () => {
    expect(playReviewsUrl("com.setupsworks.naazhi")).toBe("https://play.google.com/store/apps/details?id=com.setupsworks.naazhi&showAllReviews=true");
  });
});
