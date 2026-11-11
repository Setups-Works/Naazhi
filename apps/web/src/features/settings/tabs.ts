/** The Settings sections. Each has its own address, e.g. /dashboard/settings/security; "home" is the grid of sections. */
export type SettingsTab =
  | "home"
  | "profile"
  | "prefs"
  | "appearance"
  | "billing"
  | "security"
  | "data"
  | "danger"
  | "notes"
  | "todo"
  | "skills"
  | "legal"
  | "apps"
  // Pages for things the app doesn't do yet; they say so instead of showing controls that do nothing.
  | "invites"
  | "google"
  | "microsoft"
  | "zoho"
  | "health"
  | "integrations"
  | "imports"
  | "youdo"
  | "keys"
  | "labels"
  | "email";
/** A section that has its own page (every tab except the home grid). */
export type SettingsSection = Exclude<SettingsTab, "home">;

const SLUGS: Record<SettingsSection, string> = {
  profile: "profile",
  prefs: "preferences",
  appearance: "appearance",
  billing: "billing",
  security: "security",
  data: "data",
  danger: "danger",
  notes: "notes",
  todo: "todo",
  skills: "skills",
  legal: "legal",
  apps: "get-apps",
  invites: "invites",
  google: "google",
  microsoft: "microsoft",
  zoho: "zoho",
  health: "health",
  integrations: "integrations",
  imports: "imports",
  youdo: "youdo",
  keys: "keys",
  labels: "labels",
  email: "email",
};

export const SETTINGS_BASE = "/dashboard/settings";

export const settingsHref = (tab: SettingsTab) => (tab === "home" ? SETTINGS_BASE : `${SETTINGS_BASE}/${SLUGS[tab]}`);

/** "preferences" → "prefs"; null when the address names no section. */
export const tabFromSlug = (slug: string | undefined): SettingsSection | null =>
  (Object.keys(SLUGS) as SettingsSection[]).find((k) => SLUGS[k] === slug) ?? null;

/** The section named by a pathname, or null when Settings is not open. A bare /dashboard/settings opens the home grid. */
export function tabFromPath(path: string): SettingsTab | null {
  if (path !== SETTINGS_BASE && !path.startsWith(`${SETTINGS_BASE}/`)) return null;
  const slug = path.slice(SETTINGS_BASE.length + 1).split("/")[0];
  if (!slug) return "home";
  return tabFromSlug(slug) ?? "home";
}
