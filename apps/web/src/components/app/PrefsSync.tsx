"use client";
import { useEffect } from "react";
import { writePrefs, type Prefs } from "../../lib/prefs";
import { applyLook, clearLook, saveLook } from "../../lib/look";

/** Mirrors the account's preferences into localStorage and onto <html> (density, motion, scheme, accent) on every app page. */
export default function PrefsSync({ prefs }: { prefs: Prefs }) {
  useEffect(() => {
    writePrefs(prefs);
    const el = document.documentElement;
    el.dataset.density = prefs.density;
    el.dataset.motion = prefs.reduceMotion ? "reduce" : "full";
    applyLook(prefs.scheme, prefs.accent);
    saveLook(prefs.scheme, prefs.accent);
    // "System" follows the device live, so switching the OS to dark mode changes the app without a reload.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = () => applyLook(prefs.scheme, prefs.accent);
    if (prefs.scheme === "system") mq.addEventListener("change", follow);
    return () => {
      mq.removeEventListener("change", follow);
      delete el.dataset.density;
      delete el.dataset.motion;
      clearLook();
    };
  }, [prefs]);
  return null;
}
