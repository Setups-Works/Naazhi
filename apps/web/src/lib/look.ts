import type { Accent, Scheme } from "./prefs";

const SCHEME_CLASSES = ["cream", "dark"] as const;

/** The scheme actually drawn: "system" follows the device's light/dark setting. */
export function resolveScheme(scheme: Scheme): "light" | "cream" | "dark" {
  if (scheme !== "system") return scheme;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Puts the scheme (a class) and accent (data-accent) on <html>, where the tokens in globals.css read them. */
export function applyLook(scheme: Scheme, accent: Accent) {
  const el = document.documentElement;
  const drawn = resolveScheme(scheme);
  el.classList.remove(...SCHEME_CLASSES);
  if (drawn !== "light") el.classList.add(drawn);
  if (accent === "default") delete el.dataset.accent;
  else el.dataset.accent = accent;
}

/** Back to the public site's look (light, ink) when leaving the app. */
export function clearLook() {
  const el = document.documentElement;
  el.classList.remove(...SCHEME_CLASSES);
  delete el.dataset.accent;
}

const LOOK_KEY = "naazhi.look";

/** Remembers the scheme and accent in this browser so the next app page can paint them before React loads. */
export function saveLook(scheme: Scheme, accent: Accent) {
  try {
    window.localStorage.setItem(LOOK_KEY, JSON.stringify({ scheme, accent }));
  } catch {
    /* storage unavailable — the page still switches once PrefsSync runs */
  }
}

/**
 * A tiny inline script for the root layout: on app pages (the /dashboard routes, or anything on the app host) it applies the
 * remembered scheme and accent before the first paint, so cream and dark don't flash white. The public site is never touched.
 * It lives in the root layout because that layout is only ever server-rendered and hydrated, never re-rendered on the client.
 */
export function lookBootScript(appHost: string | null) {
  return `(function(){try{var l=location,app=l.pathname.indexOf("/dashboard")===0||l.pathname.indexOf("/admin")===0${
    appHost ? `||l.host===${JSON.stringify(appHost)}` : ""
  };if(!app)return;var v=JSON.parse(localStorage.getItem(${JSON.stringify(LOOK_KEY)})||"null");if(!v)return;var d=document.documentElement,s=v.scheme;if(s==="system")s=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";if(s==="cream"||s==="dark")d.classList.add(s);if(v.accent&&v.accent!=="default")d.dataset.accent=v.accent;}catch(e){}})();`;
}
