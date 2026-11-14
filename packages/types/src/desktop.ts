import config from "./desktop.json";

/**
 * The contract between the desktop shell (apps/desktop) and the web app it shows. The shell is a thin Electron window around the hosted
 * web app, so a feature built for the web reaches the desktop by itself; this file lists the only things the two sides agree on.
 *
 * `desktop.json` is the one place for the identity values. The shell's build, the installer config and the web app all read it.
 */
export const DESKTOP = config as { appId: string; productName: string; scheme: string };

/** Where a deep link lands: `naazhi://<id>` opens `path` (the web app maps it to the clean address on the app host). */
export const DESKTOP_SECTIONS = [
  { id: "home", label: "Home", path: "/dashboard" },
  { id: "todo", label: "To-do", path: "/dashboard/todo" },
  { id: "notes", label: "Notes", path: "/dashboard/notes" },
  { id: "journal", label: "Journal", path: "/dashboard/journal" },
  { id: "chat", label: "Chat", path: "/dashboard/chat" },
  { id: "calendar", label: "Calendar", path: "/dashboard/calendar" },
  { id: "settings", label: "Settings", path: "/dashboard/settings" },
] as const;

export type DesktopSectionId = (typeof DESKTOP_SECTIONS)[number]["id"];

/** The path a deep link `naazhi://notes/abc?x=1` opens, or null when the section is unknown. Anything but a plain app path is refused. */
/** `url` is a parsed `URL` (only these four parts are read). */
export function deepLinkPath(url: { protocol: string; hostname: string; pathname: string; search: string }): string | null {
  if (url.protocol !== `${DESKTOP.scheme}:`) return null;
  const section = DESKTOP_SECTIONS.find((s) => s.id === url.hostname);
  if (!section) return null;
  const rest = url.pathname.replace(/\/+$/, "");
  if (rest.includes("..") || rest.includes("//")) return null;
  // "home" has no sub-pages; every other section may name one (naazhi://notes/<id>).
  return `${section.path}${section.id === "home" ? "" : rest}${url.search}`;
}

export type DesktopPlatform = "mac" | "win" | "linux";

/** What the page reports so the window frame matches the theme: colours are the page's resolved `--page` and `--fg`. */
export type DesktopChrome = { background: string; foreground: string; barHeight: number };

/** A reminder the page hands the shell to show as a system notification at `at` (milliseconds), even with the window closed. */
export type DesktopReminder = { id: string; at: number; title: string; body: string; path: string };

/** Something to show as a system notification right now (an invitation, a message from the team). Clicking it opens `path`. */
export type DesktopNotice = { id: string; title: string; body: string; path: string };

/** The `window.naazhiDesktop` object the shell's preload script exposes. Absent in a normal browser. */
export type NaazhiDesktopApi = {
  platform: DesktopPlatform;
  version: string;
  /** Opens the system browser to sign in (Google refuses sign-in inside an embedded window). With a code, the browser page authorizes that code and the page collects the sign-in itself; without one the shell signs in when the browser hands back a naazhi:// link. */
  signInWithBrowser(code?: string): Promise<void>;
  /** Tells the shell the page's colours and top-bar height so the title bar and traffic lights fit the theme. */
  setChrome(chrome: DesktopChrome): void;
  /** Replaces the reminders the shell will show (to-dos with a reminder time). Call again whenever they change; an empty list clears them. */
  setReminders(reminders: DesktopReminder[]): void;
  /** Shows a system notification now. Used for inbox messages that arrive while the app is open (for example a shared-journal invitation). */
  notify(notice: DesktopNotice): void;
  /** Called with an app path (`/dashboard/notes`) when a menu item, shortcut or deep link asks the page to go somewhere. */
  onNavigate(listener: (path: string) => void): () => void;
};
