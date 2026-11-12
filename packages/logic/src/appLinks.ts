/**
 * Web links that open in the phone app. When the app is installed, a link to the app's address (a shared chat, a journal invitation, a
 * dashboard page) opens the matching screen instead of the browser; without the app it opens on the web as before.
 *
 * Three places must agree on which paths belong to the app, so the list lives here once:
 * - the website's verification files (`/.well-known/apple-app-site-association`, `assetlinks.json`),
 * - the app's Android intent filters (`apps/mobile/app.config.js`, which can't import this file, so a test compares them),
 * - the app's router (`apps/mobile/src/app/+native-intent.ts`), which turns a web path into a screen with `appRouteForWebPath`.
 */

/** The dashboard's pages. On the app address their paths drop the `/dashboard` prefix (see `DASHBOARD_SECTIONS` in apps/web/src/lib/hosts.ts). */
export const APP_LINK_SECTIONS = ["calendar", "chat", "health", "journal", "library", "notes", "settings", "todo", "workspace"] as const;

/** Every path prefix the app claims: a prefix matches itself and anything below it. */
export const APP_LINK_PREFIXES: readonly string[] = ["/dashboard", "/home", "/share", ...APP_LINK_SECTIONS.map((s) => `/${s}`)];

const split = (path: string) => {
  const i = path.search(/[?#]/);
  return i === -1 ? { pathname: path, rest: "" } : { pathname: path.slice(0, i), rest: path.slice(i) };
};

/** True when the app should take this path (a full URL is read by its path). */
export function isAppLink(urlOrPath: string): boolean {
  const { pathname } = split(toPath(urlOrPath));
  return APP_LINK_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** A full URL (`https://host/a?b=1`) as its path and query (`/a?b=1`); a path is returned as it is. */
export function toPath(urlOrPath: string): string {
  // No URL class here (this package has no DOM types): drop the scheme and host, keep the path, query and hash.
  const m = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]*(.*)$/i.exec(urlOrPath);
  if (!m) return urlOrPath;
  const rest = m[1] ?? "";
  return rest === "" || rest[0] === "?" || rest[0] === "#" ? `/${rest}` : rest;
}

/**
 * The phone app's screen for a web path, or null when the app has no such screen (the caller then leaves the path alone).
 * Handles both addresses of the same page: `/dashboard/journal/collaborate` (one host) and `/journal/collaborate` (the app's own host).
 * Query strings are kept.
 */
export function appRouteForWebPath(urlOrPath: string): string | null {
  const { pathname, rest } = split(toPath(urlOrPath));
  const parts = pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  if (parts[0] === "dashboard") parts.shift();
  const [a, b, c] = parts;
  const go = (route: string) => `${route}${rest}`;

  if (a === "share" && b) return go(`/share/${b}`);
  if (!a || a === "home") return go("/home");
  switch (a) {
    case "journal":
      if (b === "collaborate") return go("/journal/collaborate");
      if (b === "shared" && c) return go(`/journal/shared/${c}`);
      return go("/journal");
    case "notes":
      return b ? go(`/note/${b}`) : go("/notes");
    case "todo":
    case "calendar":
      return go("/todo");
    case "chat":
      return go("/chat");
    case "library":
      return go("/library");
    case "workspace":
      return b === "reader" && c ? go(`/reader/${c}`) : go("/workspace");
    case "health":
      return b ? go(`/health/${b}`) : go("/health");
    case "settings":
      return go("/profile");
    default:
      return null;
  }
}
