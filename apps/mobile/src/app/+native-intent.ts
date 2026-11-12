import { appRouteForWebPath, isAppLink } from "@untitled/logic";

/**
 * Links that arrive from outside the app. A web link to the app's address (https://…/journal/collaborate, a shared chat, a dashboard
 * page) is turned into the screen it names; the app's own scheme links and plain screen paths are left as they are. The list of paths the
 * app claims, and the path → screen map, are in packages/logic/src/appLinks.ts (tested), so the website and the app agree.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const web = /^https?:\/\//i.test(path);
    if (!web && !(path.startsWith("/") && isAppLink(path))) return path;
    // A web link the app has no screen for opens Home rather than a "not found" page.
    return appRouteForWebPath(path) ?? (web ? "/" : path);
  } catch {
    return path;
  }
}
