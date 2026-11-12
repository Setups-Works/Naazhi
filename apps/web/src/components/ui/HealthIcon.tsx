"use client";
import { useSyncExternalStore } from "react";

/**
 * The Health icon follows the device it is shown on: Google Health Connect's logo on Android, Apple's heart on iPhone, iPad and Mac, and
 * Naazhi's own heart anywhere else. The server (and the first paint) always draws the own heart, then the browser switches, so there is no
 * hydration mismatch.
 */
type Kind = "heart" | "google" | "apple";
const FILE: Record<Kind, string> = { heart: "/brand/health-heart.png", google: "/brand/health-google.png", apple: "/brand/health-apple.png" };

function detect(): Kind {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "google";
  if (/iphone|ipad|ipod|macintosh|mac os/i.test(ua)) return "apple";
  return "heart";
}
const subscribe = () => () => undefined;

export default function HealthIcon({ className, fixedWidth }: { className?: string; fixedWidth?: boolean }) {
  const kind = useSyncExternalStore(subscribe, detect, () => "heart" as Kind);
  const cls = ["inline-block shrink-0 object-contain align-[-0.125em]", fixedWidth ? "w-[1.25em]" : "", className ?? ""].filter(Boolean).join(" ");
  // eslint-disable-next-line @next/next/no-img-element -- a small fixed picture sized by the surrounding text
  return <img src={FILE[kind]} alt="" width={16} height={16} className={cls} style={{ width: fixedWidth ? undefined : "1em", height: "1em" }} aria-hidden />;
}
