import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "./config/env";
import { APP_HOME, homePath, isAppPath, isSplit } from "./lib/hosts";

/** The host the request came in on (behind Azure's front end it is in `x-forwarded-host`). */
const requestHost = (request: NextRequest) => request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;

/**
 * Two jobs, both cheap.
 *
 * 1. Keep the two hosts apart when the website and the app are on different hosts: app pages asked for on the website go to the
 *    app, website pages asked for on the app go to the website, and the app's front door (`/`) goes to sign-in or the home page.
 *    On the app host the dashboard's home page lives at /home (the same page as /dashboard).
 * 2. Redirect by whether a session cookie exists. This is only a convenience: every page and API route still verifies the session
 *    against the database (currentUser()), and /admin additionally checks the admin role.
 */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const signedIn = Boolean(getSessionCookie(request));
  const split = isSplit();
  let onApp = false;

  if (split) {
    onApp = requestHost(request) === new URL(publicEnv.appUrl!).host;
    const target = (base: string, to = path) => new URL(`${to}${request.nextUrl.search}`, base);
    if (!onApp && isAppPath(path)) return NextResponse.redirect(target(publicEnv.appUrl!));
    // Signed-out visitors land on the sign-in page, signed-in ones on their home page.
    if (onApp && path === "/") return NextResponse.redirect(target(publicEnv.appUrl!, signedIn ? APP_HOME : "/login"));
    if (onApp && path === "/dashboard") return NextResponse.redirect(target(publicEnv.appUrl!, APP_HOME));
    if (onApp && !isAppPath(path)) return NextResponse.redirect(target(publicEnv.siteUrl!));
  }

  const needsSession = path.startsWith("/dashboard") || path.startsWith("/admin") || (split && path === APP_HOME);
  if (!signedIn && needsSession) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(to);
  }
  if (signedIn && (path === "/login" || path === "/signup" || path === "/forgot-password")) {
    const to = request.nextUrl.clone();
    to.pathname = homePath();
    to.search = "";
    return NextResponse.redirect(to);
  }
  // /home is shown in the address bar, but the page itself is /dashboard.
  if (split && onApp && path === APP_HOME) {
    const to = request.nextUrl.clone();
    to.pathname = "/dashboard";
    return NextResponse.rewrite(to);
  }
  return NextResponse.next();
}

// Pages only: the API, Next's own files and anything with a file extension (images, icons, the manifest) are left alone.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|opengraph-image|.*\\..*).*)"],
};
