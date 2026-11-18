/**
 * When the phone app may ask for a Google Play (or App Store) review. The store's own card is shown; this only decides the moment.
 *
 * Google's rules shape it: ask only after someone has used the app enough to have an opinion, right after a good moment (never on launch,
 * never from a button), never ask a question first, and don't ask often (Play also has its own quota and may silently show nothing).
 *
 * How it adapts to the person:
 * - It waits until they have come back on several days and done a few real things (a finished task counts, a journal entry counts more).
 * - It asks right after one of those moments, so the card appears while things are going well.
 * - Each later ask needs more good moments than the last and waits months, and it stops after a few asks for good.
 *
 * Plain functions on a small state object, so the rules are tested here and the app only stores the object.
 */

export type ReviewMoment = "task_done" | "journal_saved" | "note_created" | "streak";

export type ReviewState = {
  /** When the app was first opened (ms), set on the first session. */
  firstOpenAt: number | null;
  /** Separate visits: opens at least `sessionGapMinutes` apart. */
  sessions: number;
  lastSessionAt: number | null;
  /** Weighted good moments so far (see MOMENT_WEIGHT). */
  points: number;
  /** How many times the store card has been requested, when last, and the points at that time. */
  asks: number;
  lastAskAt: number | null;
  pointsAtLastAsk: number;
};

export const REVIEW_RULES = {
  /** Days since the first open before the first ask. */
  minDays: 3,
  /** Visits before the first ask. */
  minSessions: 5,
  /** New points needed before ask 1, 2, 3 (counted since the previous ask). */
  pointSteps: [8, 25, 60] as readonly number[],
  /** Days between asks. */
  cooldownDays: 120,
  /** After this many asks it never asks again. */
  maxAsks: 3,
  /** Opens closer together than this are the same visit. */
  sessionGapMinutes: 30,
} as const;

/** A journal entry or a streak means more than ticking off one task. */
export const MOMENT_WEIGHT: Record<ReviewMoment, number> = { task_done: 1, note_created: 1, journal_saved: 2, streak: 3 };

const DAY = 86_400_000;

export const emptyReviewState = (): ReviewState => ({ firstOpenAt: null, sessions: 0, lastSessionAt: null, points: 0, asks: 0, lastAskAt: null, pointsAtLastAsk: 0 });

/** Reads a stored state, filling anything missing or malformed with the starting value. */
export function parseReviewState(raw: unknown): ReviewState {
  const base = emptyReviewState();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : d);
  const opt = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
  return {
    firstOpenAt: opt(o.firstOpenAt),
    sessions: num(o.sessions, 0),
    lastSessionAt: opt(o.lastSessionAt),
    points: num(o.points, 0),
    asks: num(o.asks, 0),
    lastAskAt: opt(o.lastAskAt),
    pointsAtLastAsk: num(o.pointsAtLastAsk, 0),
  };
}

/** The app opened or came back to the front. Counts a new visit when the last one was long enough ago. */
export function noteSession(s: ReviewState, now: number): ReviewState {
  const fresh = s.lastSessionAt === null || now - s.lastSessionAt >= REVIEW_RULES.sessionGapMinutes * 60_000;
  return { ...s, firstOpenAt: s.firstOpenAt ?? now, sessions: fresh ? s.sessions + 1 : s.sessions, lastSessionAt: now };
}

export const noteMoment = (s: ReviewState, moment: ReviewMoment): ReviewState => ({ ...s, points: s.points + MOMENT_WEIGHT[moment] });

/** Whether this good moment is the time to show the store's review card. */
export function shouldAskForReview(s: ReviewState, now: number): boolean {
  const r = REVIEW_RULES;
  if (s.asks >= r.maxAsks || s.firstOpenAt === null) return false;
  if (now - s.firstOpenAt < r.minDays * DAY || s.sessions < r.minSessions) return false;
  if (s.lastAskAt !== null && now - s.lastAskAt < r.cooldownDays * DAY) return false;
  const need = r.pointSteps[Math.min(s.asks, r.pointSteps.length - 1)]!;
  return s.points - s.pointsAtLastAsk >= need;
}

export const markReviewAsked = (s: ReviewState, now: number): ReviewState => ({ ...s, asks: s.asks + 1, lastAskAt: now, pointsAtLastAsk: s.points });

/** The Play listing's reviews, for a "Rate Naazhi" button (Google says a button must open the store, not the in-app card). */
export const playReviewsUrl = (packageName: string) => `https://play.google.com/store/apps/details?id=${encodeURIComponent(packageName)}&showAllReviews=true`;
