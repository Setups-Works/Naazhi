"use client";
import { useEffect } from "react";
import { ACQUISITION_COOKIE, ACQUISITION_DAYS, parseAttribution } from "@untitled/logic/acquisition";

const NOT_COUNTED = /^\/(dashboard|admin|onboarding|invoice|api|share)(\/|$)/;
const BOT = /bot|crawl|spider|headless|lighthouse|preview/i;

/** One anonymous count per browser session: the source tags from the link, the referring site's name and the page path, nothing else. */
function countVisit() {
  try {
    if (NOT_COUNTED.test(location.pathname) || navigator.webdriver || BOT.test(navigator.userAgent)) return;
    if (window.sessionStorage.getItem("nz_visit")) return;
    window.sessionStorage.setItem("nz_visit", "1");
    const src = new URLSearchParams(location.search);
    const tags = new URLSearchParams();
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "ref", "source"]) if (src.get(k)) tags.set(k, src.get(k)!.slice(0, 80));
    let referrerHost = "";
    try {
      referrerHost = document.referrer ? new URL(document.referrer).hostname : "";
    } catch {
      /* no usable referrer */
    }
    void fetch("/api/v1/visits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: tags.toString(), referrerHost, path: location.pathname }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* storage blocked: skip the count */
  }
}

/**
 * Remembers, for 30 days, which link or site brought a visitor (utm_source, ?ref=, or the referring site), so the app can note it the
 * first time they sign in. It is a first-party cookie on Naazhi's own address holding four short words, no script from anyone else, and it
 * is only written when there is a source to remember. A tagged link replaces an older source; otherwise the first one is kept.
 */
export default function AttributionCapture() {
  useEffect(() => {
    countVisit();
    try {
      const host = location.hostname;
      const bare = /^[\d.]+$/.test(host) || host === "localhost" || !host.includes(".");
      const parent = bare ? host : host.split(".").slice(-2).join(".");
      const found = parseAttribution({ query: location.search, referrer: document.referrer, ownHosts: [host, parent] });
      if (!found) return;
      const tagged = /[?&](utm_source|ref|source)=/.test(location.search);
      const exists = document.cookie.split("; ").some((c) => c.startsWith(`${ACQUISITION_COOKIE}=`));
      if (exists && !tagged) return;
      const value = encodeURIComponent(JSON.stringify({ s: found.source, m: found.medium, c: found.campaign, r: found.referrerHost }));
      document.cookie =
        `${ACQUISITION_COOKIE}=${value}; Max-Age=${ACQUISITION_DAYS * 86400}; Path=/; SameSite=Lax` +
        (location.protocol === "https:" ? "; Secure" : "") +
        (bare ? "" : `; Domain=.${parent}`);
    } catch {
      /* cookies off: nothing to remember */
    }
  }, []);
  return null;
}
