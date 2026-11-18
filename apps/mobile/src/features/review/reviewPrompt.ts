import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { useEffect } from "react";
import { AppState, Linking, Platform } from "react-native";
import {
  emptyReviewState,
  markReviewAsked,
  noteMoment,
  noteSession,
  parseReviewState,
  playReviewsUrl,
  shouldAskForReview,
  type ReviewMoment,
  type ReviewState,
} from "@untitled/logic";

/**
 * Google Play's in-app review card, shown at a good moment. The timing rules are in packages/logic/src/reviewPrompt.ts (tested); this
 * file keeps their small counters on the phone and asks Play to show the card. Play decides whether it really appears (it has its own
 * quota), and we never ask a question first or show anything around it, as Google requires.
 *
 * Android only: the app is on Google Play, and there is no App Store listing yet. Counters are per phone and hold no content.
 */

const KEY = "naazhi.review.v1";
const PACKAGE = "com.setupsworks.naazhi";
/** The Expo Go app's id: there is no Naazhi listing to review from inside it. */
const EXPO_GO_ID = "host.exp.exponent";
/** A short pause after the good moment, so the card follows it instead of interrupting it (a toast, a closing sheet). */
const DELAY_MS = 1200;

const supported = () => Platform.OS === "android" && Application.applicationId !== EXPO_GO_ID;

/** All reads and writes go through one queue, so two quick moments can't overwrite each other's counters. */
let queue: Promise<unknown> = Promise.resolve();
function update<T>(fn: (s: ReviewState) => Promise<{ next: ReviewState; result: T }>): Promise<T | undefined> {
  const run = queue.then(async () => {
    let state = emptyReviewState();
    try {
      const raw = await AsyncStorage.getItem(KEY);
      state = parseReviewState(raw ? JSON.parse(raw) : null);
    } catch {
      /* unreadable: start again */
    }
    const { next, result } = await fn(state);
    await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
    return result;
  });
  queue = run.catch(() => undefined);
  return run.catch(() => undefined);
}

/** Asks Play for the card. Resolves true when the request was made (Play may still choose not to show it). */
async function requestCard(): Promise<boolean> {
  try {
    const StoreReview = await import("expo-store-review");
    if (!(await StoreReview.isAvailableAsync())) return false;
    await new Promise((r) => setTimeout(r, DELAY_MS));
    // Only while the app is on screen: a card requested in the background is wasted against Play's quota.
    if (AppState.currentState !== "active") return false;
    await StoreReview.requestReview();
    return true;
  } catch {
    // Not installed from Play, an old build without the module, or Play said no: nothing to show.
    return false;
  }
}

/**
 * Call after something good the person did: finishing a task, saving a journal entry, creating a note. Never call it from a button.
 * It counts the moment and, when the rules say this is the time, asks Play for the review card.
 */
export function notePositiveMoment(moment: ReviewMoment): void {
  if (!supported()) return;
  void update(async (s) => {
    const counted = noteMoment(s, moment);
    const now = Date.now();
    if (!shouldAskForReview(counted, now)) return { next: counted, result: false };
    // Recorded as asked even if Play shows nothing: the rules stay spaced out, like Play's own quota.
    const asked = await requestCard();
    return { next: asked ? markReviewAsked(counted, now) : counted, result: asked };
  });
}

/** Counts visits: on launch, and each time the app comes back to the front. Mounted once, in the root layout, for signed-in people. */
export function useReviewSessions(active: boolean) {
  useEffect(() => {
    if (!active || !supported()) return;
    const visit = () => void update(async (s) => ({ next: noteSession(s, Date.now()), result: null }));
    visit();
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") visit();
    });
    return () => sub.remove();
  }, [active]);
}

/** For a "Rate Naazhi" button: opens the Play listing's reviews (Google says buttons must not trigger the in-app card). */
export async function openPlayReviews(): Promise<void> {
  const market = `market://details?id=${PACKAGE}&showAllReviews=true`;
  try {
    if (Platform.OS === "android" && (await Linking.canOpenURL(market))) return void (await Linking.openURL(market));
  } catch {
    /* fall through to the web listing */
  }
  await Linking.openURL(playReviewsUrl(PACKAGE)).catch(() => undefined);
}
