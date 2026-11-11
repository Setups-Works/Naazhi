import { publicEnv } from "../config/env";

/*
 * One deployment, two addresses: the website (naazhi.app) and the app (dashboard.naazhi.app). Everything here is inert until both
 * NEXT_PUBLIC_SITE_URL and NEXT_PUBLIC_APP_URL are set to different hosts, so local development and single-host setups behave as before.
 */

const trim = (u: string) => u.replace(/\/+$/, "");

/** True when the website and the app live on different hosts. */
export const isSplit = () => {
  const { siteUrl, appUrl } = publicEnv;
  return Boolean(siteUrl && appUrl && new URL(siteUrl).host !== new URL(appUrl).host);
};

/** The address of an app page (login, sign-up, dashboard). A plain path when there is no separate app host. */
export const appHref = (path: string) => (isSplit() ? `${trim(publicEnv.appUrl!)}${path}` : path);

/** The address of a website page. A plain path when there is no separate app host. */
export const siteHref = (path: string) => (isSplit() ? `${trim(publicEnv.siteUrl!)}${path}` : path);

/** On the app host the dashboard's home page is shown at /home; it is the same page as /dashboard. */
export const APP_HOME = "/home";

/** Where signed-in people land: /home on the app host, /dashboard when everything is on one host. */
export const homePath = () => (isSplit() ? APP_HOME : "/dashboard");

/** The pages inside app/dashboard. On the app host their address drops the prefix: /dashboard/workspace is shown as /workspace. */
export const DASHBOARD_SECTIONS = ["calendar", "chat", "health", "journal", "library", "notes", "settings", "todo", "workspace"];

const firstSegment = (path: string) => path.split("/")[1] ?? "";

/** True for /todo, /workspace/reader and the like (the clean addresses of the dashboard's pages). */
export const isDashboardSection = (path: string) => DASHBOARD_SECTIONS.includes(firstSegment(path));

/** The route that serves an address: /home → /dashboard, /workspace → /dashboard/workspace. Anything else is returned unchanged. */
export const internalPath = (path: string) => (path === APP_HOME ? "/dashboard" : isDashboardSection(path) ? `/dashboard${path}` : path);

/**
 * The address people should see for a route. On the app host the /dashboard prefix is dropped (/dashboard/todo?v=today → /todo?v=today,
 * /dashboard → /home); on a single host the path is returned unchanged. Query strings and hashes are kept.
 */
export const publicPath = (path: string) => {
  if (!isSplit()) return path;
  const rest = path.replace(/^\/dashboard(?=$|[/?#])/, "");
  if (rest === path) return path;
  return rest === "" || rest[0] === "?" || rest[0] === "#" ? `${APP_HOME}${rest}` : rest;
};

/** Paths that only exist on the app host. */
export const APP_PATH_PREFIXES = ["/dashboard", APP_HOME, "/admin", "/login", "/signup", "/forgot-password", "/reset-password", "/share"];

export const isAppPath = (path: string) => APP_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`)) || isDashboardSection(path);
