"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { internalPath } from "../lib/hosts";

/** The marketing header and footer don't belong inside the signed-in app (dashboard, admin and the first-run setup) or on public share pages (which have their own minimal header). */
export default function HideInApp({ children }: { children: ReactNode }) {
  const path = internalPath(usePathname());
  if (path.startsWith("/dashboard") || path.startsWith("/admin") || path.startsWith("/onboarding") || path.startsWith("/share/")) return null;
  return <>{children}</>;
}
