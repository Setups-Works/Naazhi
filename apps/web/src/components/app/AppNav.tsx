"use client";
import NotificationsPanel from "../../features/notifications/NotificationsPanel";
import { useInbox } from "../../features/notifications/queries";
import { useCrumb } from "../../lib/crumb";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Prefs } from "../../lib/prefs";
import PrefsSync from "./PrefsSync";
import { settingsHref, tabFromPath, type SettingsTab } from "../../features/settings/tabs";
import { OPEN_ONBOARDING_EVENT } from "./Onboarding";
import UniversalSearch, { OPEN_SETTINGS_EVENT } from "./UniversalSearch";
import TodoNav from "./todo/TodoNav";
import { SIDEBAR_SLOT_ID } from "./SidebarPortal";
import { Icon as FA } from "@/components/ui/Icon";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faHouse,
  faLayerGroup,
  faBookOpen,
  faComments,
  faListCheck,
  faNoteSticky,
  faCalendarDays,
  faHeartPulse,
  faBriefcase,
  faShieldHalved,
  faRightFromBracket,
  faGear,
  faCompass,
  faBars,
  faXmark,
  faTableColumns,
  faSun,
  faMoon,
  faBell,
} from "@fortawesome/free-solid-svg-icons";
import { authClient } from "../../lib/auth/client";
import { clearDrafts } from "../../lib/drafts";
import { useSwipeNav } from "../../hooks/useSwipeNav";
import { internalPath, publicPath } from "../../lib/hosts";
import { BrandMark } from "../BrandMark";
import { VIEW_TITLES, isView, isOpen } from "../../lib/tasks";
import { useTasks } from "../../features/tasks/queries";
import { useBilling } from "../../features/billing/queries";
import { usePrefsSave } from "../../features/settings/usePrefsSave";
import { applyLook, resolveScheme, saveLook } from "../../lib/look";
import { isoDate } from "../../lib/dates";

type NavItem = { href: string; t: string; icon: IconDefinition; also?: string[] };

/** One row per workspace section — pages live in app/dashboard/<section>. */
const NAV: NavItem[] = [
  { href: "/dashboard", t: "Home", icon: faHouse },
  { href: "/dashboard/journal", t: "Journal", icon: faBookOpen },
  { href: "/dashboard/chat", t: "Chat", icon: faComments },
  { href: "/dashboard/notes", t: "Notes", icon: faNoteSticky },
  { href: "/dashboard/todo", t: "To-do", icon: faListCheck },
  { href: "/dashboard/library", t: "Library", icon: faLayerGroup },
  { href: "/dashboard/calendar", t: "Calendar", icon: faCalendarDays },
  { href: "/dashboard/health", t: "Health", icon: faHeartPulse },
  { href: "/dashboard/workspace", t: "Workspace", icon: faBriefcase },
];

/** The Settings page has no row in the workspace list; this stands in for it in the breadcrumb. */
const SETTINGS_SECTION: NavItem = { href: "/dashboard/settings", t: "Settings", icon: faGear };

/** Pages that put their own list in the sidebar. */
const hasPageList = (p: string) => p.startsWith("/dashboard/chat") || p === "/dashboard/workspace/reader" || p === "/dashboard/journal" || p === "/dashboard/notes";

/** Second breadcrumb for pages below a section. */
const SUBPAGES: [prefix: string, label: string][] = [
  ["/dashboard/journal/collaborate", "Shared journals"],
  ["/dashboard/journal/shared", "Shared journal"],
  ["/dashboard/workspace/reader", "Reader"],
  ["/dashboard/chat/", "Conversation"],
];


type Account = {
  name: string;
  email: string;
  username: string | null;
  displayUsername: string | null;
  hasPassword: boolean;
  providers: string[];
  createdAt: string;
  avatarUrl: string | null;
  lastSignIn: string | null;
};

const isHere = (item: NavItem, path: string) =>
  item.href === "/dashboard" ? path === "/dashboard" : [item.href, ...(item.also ?? [])].some((h) => path.startsWith(h));

/** Row in the sidebar: an icon square in the rail, icon + label when expanded. */
const ROW =
  "group/row flex h-9 w-full items-center gap-3 rounded-ctl px-[9px] text-[14.5px] text-fg-muted transition-colors duration-150 hover:bg-hover hover:text-fg aria-[current=page]:bg-press aria-[current=page]:text-fg";

export default function AppNav({
  name,
  email,
  admin,
  account,
  prefs,
}: {
  name: string;
  email: string;
  admin: boolean;
  account: Account;
  prefs: Prefs;
}) {
  // On the app host the address bar shows clean paths (/todo); the rest of this component works with the routes (/dashboard/todo).
  const path = internalPath(usePathname());
  const search = useSearchParams();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [drawer, setDrawer] = useState(false);
  // The sidebar rests as a slim icon rail; the toggle opens the labelled panel and the choice is remembered on this device.
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem("sb-expanded") === "1") setExpanded(true);
    } catch {
      /* storage blocked: stay on the rail */
    }
  }, []);
  const toggleSidebar = () =>
    setExpanded((on) => {
      try {
        localStorage.setItem("sb-expanded", on ? "0" : "1");
      } catch {
        /* not remembered */
      }
      return !on;
    });
  // Settings is an ordinary page (/dashboard/settings/<section>); the sidebar turns into its menu while it is open.
  const settingsTab = tabFromPath(path);
  const openSettings = useCallback((tab: SettingsTab = "home") => router.push(publicPath(settingsHref(tab))), [router]);
  const box = useRef<HTMLDivElement>(null);

  const here = path;
  const current = settingsTab ? -1 : NAV.findIndex((t) => isHere(t, here));
  const section = settingsTab ? SETTINGS_SECTION : (NAV[current] ?? NAV[0]);
  const todoView = here.startsWith("/dashboard/todo") ? search.get("v") : null;
  const crumb = useCrumb();
  const unread = useInbox().data?.unread ?? 0;
  const [inboxOpen, setInboxOpen] = useState(false);
  // To-do count on the sidebar row: open tasks that are overdue or due today (sub-tasks count under their parent).
  const { tasks } = useTasks();
  const dueCount = tasks.filter((t) => isOpen(t) && !t.parent_id && t.due_date && t.due_date <= isoDate()).length;
  const billing = useBilling().data;
  const planLabel = billing ? (billing.plan && billing.status !== "none" ? billing.plan.name : "Free") : null;
  const look = usePrefsSave(prefs);
  const dark = resolveScheme(look.prefs.scheme) === "dark";
  const toggleTheme = () => {
    const scheme = dark ? "light" : "dark";
    applyLook(scheme, look.prefs.accent);
    saveLook(scheme, look.prefs.accent);
    void look.change({ scheme });
  };
  const sub = settingsTab
    ? undefined
    : (here.startsWith("/dashboard/journal/shared") && crumb ? crumb : undefined) ??
      (SUBPAGES.find(([p]) => here.startsWith(p))?.[1] ??
      (todoView && isView(todoView)
        ? VIEW_TITLES[todoView]
        : here.startsWith("/dashboard/todo")
          ? "Today"
          : here === "/dashboard/journal" || here === "/dashboard/chat"
            ? crumb
            : undefined));

  // On a touch screen, swipe the page sideways to go to the next or previous section.
  useSwipeNav(settingsTab ? 0 : current, settingsTab ? 1 : NAV.length, (to) => !settingsTab && router.push(publicPath(NAV[to].href)));

  // While Settings is open the sidebar shows its sections, so it opens (and goes back to how it was when Settings closes).
  const wasExpanded = useRef<boolean | null>(null);
  const settingsOpen = !!settingsTab;
  useEffect(() => {
    if (settingsOpen && wasExpanded.current === null) {
      wasExpanded.current = expanded;
      setExpanded(true);
    } else if (!settingsOpen && wasExpanded.current !== null) {
      setExpanded(wasExpanded.current);
      wasExpanded.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when Settings opens or closes
  }, [settingsOpen]);
  // The sidebar's current width, for layers that sit beside it (Settings) so it never covers them.
  const sbRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = sbRef.current;
    if (!el) return;
    const root = document.documentElement;
    const set = () => root.style.setProperty("--sb-w", `${el.offsetWidth}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--sb-w");
    };
  }, []);
  // On a phone the sidebar is a drawer: close it once a page, chat or view has been picked from it.
  const here2 = `${path}?${search.toString()}`;
  useEffect(() => {
    setDrawer(false);
  }, [here2]);

  // ⌥1…⌥9 open the sections in the order they are listed (⌥5 is To-do).
  useEffect(() => {
    const go = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const n = /^Digit([1-9])$/.exec(e.code)?.[1];
      const el = e.target as HTMLElement | null;
      if (!n || el?.closest("input, textarea, select, [contenteditable='true']")) return;
      const item = NAV[Number(n) - 1];
      if (!item) return;
      e.preventDefault();
      router.push(publicPath(item.href));
    };
    window.addEventListener("keydown", go);
    return () => window.removeEventListener("keydown", go);
  }, [router]);

  useEffect(() => {
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key !== "Escape") return;
        setMenu(false);
        setDrawer(false);
      } else if (!box.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  // Universal search can open Settings.
  useEffect(() => {
    const show = () => openSettings();
    window.addEventListener(OPEN_SETTINGS_EVENT, show);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, show);
  }, [openSettings]);

  async function signOut() {
    await clearDrafts(); // unsent text and recordings must not be visible to the next person on this computer
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  const initial = (name[0] || "?").toUpperCase();
  const avatar = account.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={account.avatarUrl} alt="" className="size-full object-cover" />
  ) : (
    initial
  );

  return (
    <>
      {/* Phones: a slim bar with the menu button; the sidebar slides in over the page. */}
      <header className="ap-top">
        <button type="button" className="ap-icon ap-only-phone" aria-label="Open menu" aria-expanded={drawer} onClick={() => setDrawer(true)}>
          <FA icon={faBars} />
        </button>
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[14px]">
          <Link
            href={publicPath(section.href)}
            className={`flex min-w-0 items-center gap-2 rounded-tab px-1.5 py-1 hover:bg-hover ${sub ? "text-fg-muted" : "text-fg"}`}
          >
            <FA icon={section.icon} className="text-[12.5px] text-fg-subtle" />
            <span className="truncate">{section.t}</span>
          </Link>
          {sub && (
            <>
              <span aria-hidden className="text-fg-faint">
                /
              </span>
              <span aria-current="page" className="truncate text-fg">
                {sub}
              </span>
            </>
          )}
        </nav>
      </header>

      {drawer && <div aria-hidden className="ap-scrim" onClick={() => setDrawer(false)} />}

      <aside ref={sbRef} className="sb" data-expanded={expanded} data-drawer={drawer} data-mode={settingsTab ? "settings" : undefined} aria-label="Sidebar">
        <div className="sb-top">
          <Link href={publicPath("/dashboard")} className="sb-brand" onClick={() => setDrawer(false)}>
            {/* The cream mark on the dark scheme (docs/BRAND.md); CSS shows the one that fits. */}
            <BrandMark size={22} className="brand-on-light" />
            <BrandMark size={22} tone="light" className="brand-on-dark" />
            <span className="sb-label font-brand text-[21px] leading-none tracking-[-0.02em] text-fg">Naazhi</span>
          </Link>
          <button
            type="button"
            className="ap-icon sb-toggle"
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={expanded}
            onClick={toggleSidebar}
          >
            <FA icon={faTableColumns} />
          </button>
          <button type="button" className="ap-icon ap-only-phone ml-auto" aria-label="Close menu" onClick={() => setDrawer(false)}>
            <FA icon={faXmark} />
          </button>
        </div>

        <div className="sb-scroll">
          <div style={settingsTab ? { display: "none" } : undefined}>
            <UniversalSearch admin={admin} className={`sb-search ${ROW} bg-transparent shadow-none`} />
          </div>
          <nav aria-label="Workspace" className="mt-1 flex flex-col gap-0.5" style={settingsTab ? { display: "none" } : undefined}>
            {NAV.map((item, i) => (
              <Link
                key={item.href}
                href={publicPath(item.href)}
                aria-current={i === current && !settingsTab ? "page" : undefined}
                title={item.t}
                className={ROW}
                onClick={() => setDrawer(false)}
              >
                <FA icon={item.icon} className="w-4 shrink-0 text-[14px]" />
                <span className="sb-label truncate">{item.t}</span>
                {item.href === "/dashboard/todo" && dueCount > 0 && (
                  <small className="sb-label ml-auto text-[12px] font-medium text-critical group-hover/row:hidden">{dueCount}</small>
                )}
                {i < 9 && <kbd className="sb-label ml-auto hidden font-sans text-[12px] text-ink-4 group-hover/row:inline">⌥{i + 1}</kbd>}
              </Link>
            ))}
          </nav>
          {/* The to-do views live here while you are on the To-do page; the rail keeps only the icons. */}
          {here.startsWith("/dashboard/todo") && !settingsTab && (
            <div className="sb-sub">
              <TodoNav onNavigate={() => setDrawer(false)} />
            </div>
          )}
          {/* Other pages with a list of their own (Chat…) draw it here through SidebarPortal. */}
          {(hasPageList(here) || settingsTab) && <div className="sb-sub" id={SIDEBAR_SLOT_ID} data-settings={!!settingsTab} />}
        </div>

        <div className="sb-foot" ref={box} style={settingsTab ? { display: "none" } : undefined}>
          {/* One compact row, as in the reference: theme and settings on the left, the plan and your picture (account menu) on the right. */}
          <div className="sb-foot-row">
            <button type="button" className="ap-icon" aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} title={dark ? "Switch to light" : "Switch to dark"} onClick={toggleTheme}>
              <FA icon={dark ? faMoon : faSun} />
            </button>
            <button
              type="button"
              className="ap-icon"
              aria-label="Settings"
              title="Settings"
              aria-current={settingsTab ? "page" : undefined}
              onClick={() => {
                setDrawer(false);
                openSettings();
              }}
            >
              <FA icon={faGear} />
            </button>
            <button type="button" className="ap-icon relative" aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"} title="Notifications" onClick={() => setInboxOpen(true)}>
              <FA icon={faBell} />
              {unread > 0 && <i className="absolute top-1 right-1 size-2 rounded-full bg-critical" aria-hidden />}
            </button>
            {planLabel && <small className="sb-label ml-auto shrink-0 rounded-xs bg-hover px-2 py-1 text-[12px] text-ink-2">{planLabel}</small>}
            <button type="button" className="sb-avatar" aria-haspopup="menu" aria-expanded={menu} aria-label={`Account menu, ${name}`} onClick={() => setMenu(!menu)}>
              <span className="ap-avatar">{avatar}</span>
            </button>
          </div>
          {menu && (
            <div className="ap-menu" role="menu">
              <div className="ap-menu-id">
                <b>{name}</b>
                <small>{email}</small>
              </div>
              <button
                role="menuitem"
                onClick={() => {
                  setMenu(false);
                  setDrawer(false);
                  openSettings();
                }}
              >
                <FA icon={faGear} /> Settings
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setMenu(false);
                  setDrawer(false);
                  window.dispatchEvent(new Event(OPEN_ONBOARDING_EVENT));
                }}
              >
                <FA icon={faCompass} /> Getting started
              </button>
              {admin && (
                <Link role="menuitem" href="/admin" onClick={() => setMenu(false)}>
                  <FA icon={faShieldHalved} /> Admin panel
                </Link>
              )}
              <button role="menuitem" onClick={signOut}>
                <FA icon={faRightFromBracket} /> Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      {inboxOpen && <NotificationsPanel onClose={() => setInboxOpen(false)} />}
      <PrefsSync prefs={prefs} />
    </>
  );
}
