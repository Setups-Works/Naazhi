/**
 * Where a person came from: the link they followed (utm_source, utm_medium, utm_campaign, ref), or the site that sent them, or, in the
 * phone app, the Google Play install referrer. Shared by the website, the server and the app so all three read a source the same way.
 * Only these four small, cleaned values are ever kept: no addresses, no queries, nothing about the person.
 */
export type Attribution = { source: string; medium: string; campaign: string; referrerHost: string };

/** The first-party cookie that remembers the source for 30 days, until the person signs up. */
export const ACQUISITION_COOKIE = "nz_src";
export const ACQUISITION_DAYS = 30;

/** Lower case, letters, digits, dot, dash and underscore only, so a source is always safe to store and to group by. */
export const cleanTag = (v: string | null | undefined, max = 60): string =>
  (v ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);

const KNOWN: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(x|twitter)\.com$|^t\.co$/, "x"],
  [/(^|\.)reddit\.com$|^redd\.it$/, "reddit"],
  [/(^|\.)(facebook|fb)\.com$/, "facebook"],
  [/(^|\.)youtube\.com$|^youtu\.be$/, "youtube"],
  [/(^|\.)linkedin\.com$|^lnkd\.in$/, "linkedin"],
  [/(^|\.)whatsapp\.com$|^wa\.me$/, "whatsapp"],
  [/(^|\.)t\.me$|(^|\.)telegram\.org$/, "telegram"],
  [/(^|\.)github\.com$/, "github"],
  [/(^|\.)quora\.com$/, "quora"],
  [/(^|\.)medium\.com$/, "medium"],
  [/(^|\.)google\.[a-z.]+$/, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
];
const SEARCH = new Set(["google", "bing", "duckduckgo"]);

/** A friendly source name for a referring host ("l.instagram.com" → "instagram"); an unknown site keeps its own name. */
export function sourceFromHost(host: string): string {
  const h = host.toLowerCase().replace(/^www\./, "");
  for (const [re, name] of KNOWN) if (re.test(h)) return name;
  return cleanTag(h, 60);
}

function hostOf(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  if (!v) return "";
  try {
    return new URL(v.includes("://") ? v : `https://${v}`).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Reads a source from a query string ("?utm_source=instagram&utm_medium=social&utm_campaign=launch") or an install referrer, falling back
 * to the page that sent the visitor. Returns null for a plain visit with nothing to go on. `ownHosts` are Naazhi's own addresses: a
 * referrer from them is the person moving around the site, not a source.
 */
export function parseAttribution(input: { query?: string | null; referrer?: string | null; ownHosts?: string[] }): Attribution | null {
  const q = new URLSearchParams((input.query ?? "").replace(/^\?/, ""));
  const tagged = cleanTag(q.get("utm_source") || q.get("ref") || q.get("source"));
  const medium = cleanTag(q.get("utm_medium"));
  const campaign = cleanTag(q.get("utm_campaign"), 80);
  const refHost = hostOf(input.referrer);
  const own = (input.ownHosts ?? []).map((h) => h.toLowerCase().replace(/^www\./, ""));
  const external = !!refHost && !own.some((o) => refHost === o || refHost.endsWith(`.${o}`));
  if (tagged) return { source: tagged, medium, campaign, referrerHost: external ? cleanTag(refHost, 120) : "" };
  if (external) {
    const source = sourceFromHost(refHost);
    return { source, medium: SEARCH.has(source) ? "organic" : "referral", campaign: "", referrerHost: cleanTag(refHost, 120) };
  }
  return null;
}

/** What the server stores for a person who arrived with no source at all. */
export const DIRECT: Attribution = { source: "direct", medium: "", campaign: "", referrerHost: "" };

/** Re-cleans anything that came from a cookie or a request body: it is never trusted as it arrives. */
export function sanitizeAttribution(a: Partial<Attribution> | null | undefined): Attribution {
  const source = cleanTag(a?.source);
  if (!source) return DIRECT;
  return { source, medium: cleanTag(a?.medium), campaign: cleanTag(a?.campaign, 80), referrerHost: cleanTag(a?.referrerHost, 120) };
}

/** Builds a tracked link. For Google Play the tags go in the `referrer` parameter, which the app reads back after install. */
export function trackedLink(base: string, tags: { source: string; medium?: string; campaign?: string }, kind: "web" | "play" = "web"): string {
  const params = new URLSearchParams();
  params.set("utm_source", cleanTag(tags.source) || "unknown");
  if (cleanTag(tags.medium)) params.set("utm_medium", cleanTag(tags.medium));
  if (cleanTag(tags.campaign, 80)) params.set("utm_campaign", cleanTag(tags.campaign, 80));
  const url = new URL(base);
  if (kind === "play") url.searchParams.set("referrer", params.toString());
  else for (const [k, v] of params) url.searchParams.set(k, v);
  return url.toString();
}
