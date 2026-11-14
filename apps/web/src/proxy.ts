import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { publicEnv } from "./config/env";
import { crawlerOf, isCountedPath } from "./lib/crawlers";
import { recordCrawl } from "./server/services/admin/crawlers";
import { APP_HOME, appHref, HELP_ROUTE, helpHref, homePath, internalPath, isAppPath, isDashboardSection, isHelpPath, isHelpSplit, isSplit, publicPath } from "./lib/hosts";

/** Files with an extension, which the matcher normally skips, that crawlers fetch first: they are counted and left exactly as they were. */
const CRAWLER_FILES = new Set(["/robots.txt", "/sitemap.xml", "/llms.txt", "/llms-full.txt"]);

/** The host the request came in on (behind Azure's front end it is in `x-forwarded-host`). */
const requestHost = (request: NextRequest) => request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;

/**
 * Two jobs, both cheap.
 *
 * 1. Keep the two hosts apart when the website and the app are on different hosts: app pages asked for on the website go to the
 *    app, website pages asked for on the app go to the website, and the app's front door (`/`) goes to sign-in or the home page.
 *    On the app host the dashboard's pages drop the /dashboard prefix (/home, /todo, /workspace…); the pages themselves still
 *    live in app/dashboard, so /dashboard/todo is redirected to /todo and /todo is served by the same page.
 * 2. Redirect by whether a session cookie exists. This is only a convenience: every page and API route still verifies the session
 *    against the database (currentUser()), and /admin additionally checks the admin role.
 */
export function proxy(request: NextRequest, event: NextFetchEvent) {
  const path = request.nextUrl.pathname;

  // Count visits from known crawlers (search engines, AI assistants, link previews) for Admin → Crawlers. It runs after the response
  // is on its way (waitUntil), so it never slows a page. The files crawlers read first are counted and then served as before.
  const crawler = crawlerOf(request.headers.get("user-agent"));
  if (crawler && isCountedPath(path)) event.waitUntil(recordCrawl({ ...crawler, path, host: requestHost(request) }));
  if (CRAWLER_FILES.has(path)) return NextResponse.next();

  const signedIn = Boolean(getSessionCookie(request));
  const split = isSplit();
  let onApp = false;

  // The help center. Its pages live in app/help-center; people see them at the root of the help host (help.naazhi.app), or at /help on the
  // website when it has no host of its own. Only the share picture is reached by its internal address; every other internal address
  // is sent to the public one so the same page never answers at two addresses.
  const host0 = requestHost(request);
  const helpHost = isHelpSplit() ? new URL(publicEnv.helpUrl!).host : null;
  const onHelp = helpHost !== null && host0 === helpHost;
  if (path === HELP_ROUTE || path.startsWith(`${HELP_ROUTE}/`)) {
    if (path.endsWith("/opengraph-image")) return NextResponse.next();
    const rest = path.slice(HELP_ROUTE.length) || "/";
    return NextResponse.redirect(new URL(`${helpHref(rest)}${request.nextUrl.search}`, request.url));
  }
  if (onHelp) {
    // Only help pages live here; sign-in and the rest belong to the app.
    if (isAppPath(path)) return NextResponse.redirect(new URL(`${appHref(publicPath(path))}${request.nextUrl.search}`, request.url));
    const to = request.nextUrl.clone();
    to.pathname = path === "/" ? HELP_ROUTE : `${HELP_ROUTE}${path}`;
    return NextResponse.rewrite(to);
  }
  if (isHelpPath(path)) {
    if (helpHost) return NextResponse.redirect(new URL(`${helpHref(path.replace(/^\/help/, "") || "/")}${request.nextUrl.search}`, request.url));
    const to = request.nextUrl.clone();
    to.pathname = `${HELP_ROUTE}${path.slice("/help".length)}`;
    return NextResponse.rewrite(to);
  }

  if (split) {
    const host = requestHost(request);
    onApp = host === new URL(publicEnv.appUrl!).host;
    const target = (base: string, to = path) => new URL(`${to}${request.nextUrl.search}`, base);
    // The old Azure address (still in installed apps, bookmarks and shared links) hands every page over to the new domains.
    // Only that suffix: local addresses and health checks must keep answering directly.
    if (host.endsWith(".azurewebsites.net")) {
      return NextResponse.redirect(isAppPath(path) ? target(publicEnv.appUrl!, publicPath(path)) : target(publicEnv.siteUrl!));
    }
    if (!onApp && isAppPath(path)) return NextResponse.redirect(target(publicEnv.appUrl!, publicPath(path)));
    // Signed-out visitors land on the sign-in page, signed-in ones on their home page.
    if (onApp && path === "/") return NextResponse.redirect(target(publicEnv.appUrl!, signedIn ? APP_HOME : "/login"));
    // The old, prefixed address of a dashboard page goes to its clean one.
    if (onApp && (path === "/dashboard" || path.startsWith("/dashboard/"))) return NextResponse.redirect(target(publicEnv.appUrl!, publicPath(path)));
    if (onApp && !isAppPath(path)) return NextResponse.redirect(target(publicEnv.siteUrl!));
  }

  // A clean address (/home, /todo…) is a dashboard page; everything below treats it like the route that serves it.
  const clean = split && onApp && (path === APP_HOME || isDashboardSection(path));
  const route = clean ? internalPath(path) : path;

  if (!signedIn && (route.startsWith("/dashboard") || route.startsWith("/admin") || route.startsWith("/onboarding") || route.startsWith("/invoice"))) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(to);
  }
  // `stale` is added by a page that found the session cookie unusable (expired, revoked, or the server could not check it right then).
  // Without this exception that page sends the person to sign-in, this rule sends them straight back, and the browser (or the desktop
  // app) gives up with "too many redirects". Signing in replaces the cookie.
  if (signedIn && !request.nextUrl.searchParams.has("stale") && (path === "/login" || path === "/signup" || path === "/forgot-password")) {
    const to = request.nextUrl.clone();
    to.pathname = homePath();
    to.search = "";
    return NextResponse.redirect(to);
  }
  // The address bar keeps the clean path; the page that answers is the one in app/dashboard.
  if (clean) {
    const to = request.nextUrl.clone();
    to.pathname = route;
    return NextResponse.rewrite(to);
  }
  return NextResponse.next();
}

// Pages only: the API, Next's own files and anything with a file extension (images, icons, the manifest) are left alone.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|opengraph-image|.*\\..*).*)", "/robots.txt", "/sitemap.xml", "/llms.txt", "/llms-full.txt"],
};
