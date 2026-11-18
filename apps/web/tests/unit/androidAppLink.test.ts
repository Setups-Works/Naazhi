import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ANDROID_APP_SCHEME, ANDROID_OPEN_APP_URL, ANDROID_PACKAGE, GOOGLE_PLAY_URL } from "../../src/lib/site";

const app = JSON.parse(readFileSync(new URL("../../../mobile/app.json", import.meta.url), "utf8")).expo;

describe("Android app link", () => {
  it("uses the phone app's own package and scheme", () => {
    expect(ANDROID_PACKAGE).toBe(app.android.package);
    expect(ANDROID_APP_SCHEME).toBe(app.scheme);
    expect(GOOGLE_PLAY_URL).toBe(`https://play.google.com/store/apps/details?id=${app.android.package}`);
  });

  it("opens the app, or falls back to Google Play", () => {
    expect(ANDROID_OPEN_APP_URL.startsWith("intent://#Intent;")).toBe(true);
    expect(ANDROID_OPEN_APP_URL.endsWith(";end")).toBe(true);
    expect(ANDROID_OPEN_APP_URL).toContain(`;scheme=${ANDROID_APP_SCHEME};`);
    expect(ANDROID_OPEN_APP_URL).toContain(`;package=${ANDROID_PACKAGE};`);
    // The fallback must be encoded, or its `?` and `=` would break the intent's own fields.
    const fallback = /S\.browser_fallback_url=([^;]+);/.exec(ANDROID_OPEN_APP_URL)?.[1];
    expect(fallback).toBe(encodeURIComponent(GOOGLE_PLAY_URL));
    expect(decodeURIComponent(fallback!)).toBe(GOOGLE_PLAY_URL);
  });
});
