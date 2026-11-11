import type { Href } from "expo-router";

import type { IconName } from "@/components/ui/Icon";

export type NavItem = {
  key: string;
  title: string;
  icon: IconName;
  href: Href;
  /** `/todo?view=` value when this row is a page inside the Plan tab. */
  view?: string;
};

/** The same sections, in the same order, as the web sidebar (`NAV` in apps/web/src/components/app/AppNav.tsx). */
export const NAV: NavItem[] = [
  { key: "home", title: "Home", icon: "house", href: "/home" },
  { key: "journal", title: "Journal", icon: "book-open", href: "/journal" },
  { key: "chat", title: "Naazhi AI", icon: "comments", href: "/chat" },
  { key: "notes", title: "Notes", icon: "note-sticky", href: { pathname: "/todo", params: { view: "notes" } }, view: "notes" },
  { key: "todo", title: "To-do", icon: "list-check", href: { pathname: "/todo", params: { view: "todo" } }, view: "todo" },
  { key: "library", title: "Library", icon: "layer-group", href: "/library" },
  { key: "calendar", title: "Calendar", icon: "calendar-days", href: { pathname: "/todo", params: { view: "calendar" } }, view: "calendar" },
  { key: "health", title: "Health", icon: "heart-pulse", href: { pathname: "/todo", params: { view: "health" } }, view: "health" },
  { key: "workspace", title: "Workspace", icon: "briefcase", href: { pathname: "/workspace", params: { view: "workspace" } }, view: "workspace" },
  { key: "reader", title: "Reader", icon: "newspaper", href: { pathname: "/workspace", params: { view: "reader" } }, view: "reader" },
];

/** Which row is current for a pathname (and the Plan tab's `view`, which is its own row on the web). */
export function activeNavKey(pathname: string, view: string | undefined): string {
  if (pathname.startsWith("/todo")) return NAV.find((n) => n.view === (view ?? "todo"))?.key ?? "todo";
  if (pathname.startsWith("/workspace")) return view === "reader" ? "reader" : "workspace";
  return NAV.find((n) => !n.view && pathname.startsWith(String(n.href)))?.key ?? "home";
}
