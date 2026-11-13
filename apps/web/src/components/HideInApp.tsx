"use client";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import { publicEnv } from "../config/env";
import { internalPath, isHelpPath, isHelpSplit } from "../lib/hosts";

const noop = () => () => {};
const AUTH_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"];
/** True in the browser when the page is on the help host. The server can't know (the layout stays static), so it answers false and the help center's own style rule hides the website's bars until this takes over. */
const onHelpHost = () => isHelpSplit() && window.location.host === new URL(publicEnv.helpUrl!).host;

/** The marketing header and footer don't belong inside the signed-in app (dashboard, admin and the first-run setup) or on public share pages (which have their own minimal header). */
export default function HideInApp({ children }: { children: ReactNode }) {
  const path = internalPath(usePathname());
  const helpHost = useSyncExternalStore(noop, onHelpHost, () => false);
  // The help center has its own header and footer.
  if (helpHost || isHelpPath(path)) return null;
  if (path.startsWith("/dashboard") || path.startsWith("/admin") || path.startsWith("/onboarding") || path.startsWith("/invoice/") || path.startsWith("/share/")) return null;
  // Sign-in pages inside the desktop app have no website header or footer; CSS hides them (html[data-desktop] is set before the first paint,
  // so there is no flash). The wrapper has no box of its own.
  return (
    <div className="contents" data-site-chrome data-auth={AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}/`))}>
      {children}
    </div>
  );
}
