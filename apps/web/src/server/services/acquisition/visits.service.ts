import "server-only";
import { z } from "zod";
import { DIRECT, parseAttribution } from "@untitled/logic/acquisition";
import { adminDb } from "../../db/builders";

/** What the website sends once per browser session: the tags from the link (only utm and ref), the referring host and the page path. */
export const visitInput = z.object({
  query: z.string().max(300).default(""),
  referrerHost: z.string().max(120).default(""),
  path: z.string().max(120).default("/"),
});
export type VisitInput = z.infer<typeof visitInput>;

// App pages are not the landing page; a visit counts only on the public site.
const APP_PATHS = /^\/(dashboard|admin|onboarding|invoice|api|share)(\/|$)/;

/**
 * Counts one visit by source. Public on purpose (visitors are not signed in), so it stores nothing about the visitor: the source tags and
 * the path are cleaned and kept, the caller is never recorded. `host` is the address that was visited, so its own pages are not a source.
 */
export async function recordVisit(input: VisitInput, host: string) {
  const path = (input.path.startsWith("/") ? input.path : `/${input.path}`).split("?")[0].slice(0, 120);
  if (APP_PATHS.test(path)) return { counted: false };
  const bare = host.split(":")[0].toLowerCase();
  const parent = /^[\d.]+$/.test(bare) || !bare.includes(".") ? bare : bare.split(".").slice(-2).join(".");
  const a = parseAttribution({ query: input.query, referrer: input.referrerHost, ownHosts: [bare, parent] }) ?? DIRECT;
  const { error } = await adminDb().from("site_visits").insert({ source: a.source, medium: a.medium, campaign: a.campaign, landing_path: path });
  if (error) throw new Error("Could not count the visit");
  return { counted: true };
}
