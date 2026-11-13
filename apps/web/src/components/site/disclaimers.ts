/**
 * The site's notes, numbered. They are printed in the footer (id `note-1`…) and pages point at them with <NoteRef n={…} />
 * instead of repeating the wording. Keep them short and true; if a note changes, change it only here.
 *
 * Notes 1–4 are on every page. `PAGE_NOTES` adds the notes that only matter on some pages (numbered 5, 6…), chosen by the
 * route in `notesForPath`, so each page carries exactly the notices it needs, for example store badges on Download.
 */
export const DISCLAIMERS: readonly string[] = [
  "Names, logos and trademarks of other companies (such as Google, Microsoft, Zoho, Apple and Slack) belong to their owners. They appear only to show which apps Naazhi can connect to. Naazhi is not affiliated with, sponsored by or endorsed by them. Google Play and the Google Play logo are trademarks of Google LLC.",
  "Features and apps marked Soon, Coming soon or Building are planned or in development and are not available yet.",
  "Screens on this site are examples with sample data. What you see in the app depends on your own notes, tasks, journal and connected apps.",
  "AI answers can be wrong. Check anything important before you rely on it.",
];

/** Notes that belong to some pages only. Add one here, then list its key against the routes in `ROUTE_NOTES`. */
const PAGE_NOTES = {
  stores:
    "Android is a trademark of Google LLC. App Store, iPhone and iPad are trademarks of Apple Inc. Phone and tablet frames are illustrations, not official product images.",
  health:
    "Apple Health and Google Health Connect are services of Apple Inc. and Google LLC. Naazhi reads health data only with your permission, and shows it for your own reference. It is not a medical device and gives no medical advice.",
  pricing:
    "Prices are in Indian rupees and may change; any taxes are shown at checkout. Payments are handled by Razorpay. The cost of your own AI key is billed by that provider, not by Naazhi.",
  ai: "AI provider names (such as OpenAI, Anthropic, Google, Groq and OpenRouter) are trademarks of their owners and appear only to say which keys you can use. Naazhi is not affiliated with them.",
  legal:
    "This page is a plain-language policy for Naazhi, not legal advice. If a translation or summary elsewhere on the site differs, the policy pages govern.",
  security:
    "Security descriptions on this site explain how Naazhi works today. They are not a certification or audit claim, and they may change as the product does.",
  people:
    "People are named and quoted here only with their permission. Ask us to change or remove yours any time through the Contact page.",
  roadmap:
    "The roadmap is a plan, not a promise. Priorities, order and scope can change, and items can move, be reshaped or be dropped. Nothing listed as Building or Planned is available yet.",
  changelog: "Release notes describe what shipped at the time of each release. Dates and details are kept as written and may not reflect later changes.",
  credits:
    "The text, designs, screens, name and logo of Naazhi are owned by Naazhi and may not be copied or reused without permission. Other companies’ names and logos belong to them. Icons are from Font Awesome Free (CC BY 4.0) and Lucide (ISC); the fonts Geist and Instrument Serif are used under the SIL Open Font License.",
} as const;

type PageNoteKey = keyof typeof PAGE_NOTES;

/** Which page notes show on which route. A route matches itself and everything under it; "/" matches only the home page. */
const ROUTE_NOTES: readonly { path: string; exact?: boolean; keys: readonly PageNoteKey[] }[] = [
  { path: "/", exact: true, keys: ["health", "ai"] },
  { path: "/download", keys: ["stores"] },
  { path: "/pricing", keys: ["pricing", "ai"] },
  { path: "/demo", keys: ["ai"] },
  { path: "/how-it-works", keys: ["ai"] },
  { path: "/faq", keys: ["ai"] },
  { path: "/privacy-security", keys: ["security"] },
  { path: "/privacy", keys: ["legal"] },
  { path: "/terms", keys: ["legal"] },
  { path: "/refund-policy", keys: ["legal"] },
  { path: "/copyright-and-licensing", keys: ["legal"] },
  { path: "/cookies", keys: ["legal"] },
  { path: "/accessibility", keys: ["legal"] },
  { path: "/responsible-disclosure", keys: ["security"] },
  { path: "/changelog", keys: ["changelog"] },
  { path: "/roadmap", keys: ["roadmap"] },
  { path: "/feature-requests", keys: ["roadmap"] },
  { path: "/early-users", keys: ["people"] },
  { path: "/team", keys: ["people"] },
];

/** Every page ends with the ownership and credits note, after the notes for that page. */
export function notesForPath(path: string): string[] {
  const keys = new Set<PageNoteKey>();
  for (const r of ROUTE_NOTES) {
    const hit = r.exact ? path === r.path : path === r.path || path.startsWith(`${r.path}/`);
    if (hit) for (const k of r.keys) keys.add(k);
  }
  keys.add("credits");
  return [...DISCLAIMERS, ...[...keys].map((k) => PAGE_NOTES[k])];
}
