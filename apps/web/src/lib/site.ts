import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faListCheck,
  faMagnifyingGlass,
  faCircleNodes,
  faNewspaper,
  faBookOpen,
  faPenToSquare,
  faEnvelope,
  faCalendarDays,
  faMicrophone,
  faPlug,
  faRoute,
  faTag,
  faShieldHalved,
  faSeedling,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
/** The public repository. App releases (the Android APK) are published under its Releases. */
export const GITHUB_REPO = "https://github.com/Setups-Works/Naazhi";

export const FEATURES = [
  { href: "/universal-search", t: "Universal Search", d: "Find anything across notes, tasks, mail and meetings." },
  { href: "/context-graph", t: "Context Graph", d: "See how your work connects." },
  { href: "/daily-brief", t: "Daily Brief", d: "Start the day knowing what matters." },
];

export const NAV_LINKS = [
  { href: "/how-it-works", t: "How it works" },
  { href: "/demo", t: "Product demo" },
  { href: "/pricing", t: "Pricing" },
  { href: "/download", t: "Download" },
];

/** Flat list for the mobile menu */
export const MENU: [string, string][] = [
  ["How it works", "/how-it-works"],
  ["Universal Search", "/universal-search"],
  ["Context Graph", "/context-graph"],
  ["Daily Brief", "/daily-brief"],
  ["Product demo", "/demo"],
  ["Pricing", "/pricing"],
  ["Download", "/download"],
  ["Privacy & Security", "/privacy-security"],
  ["Early users", "/early-users"],
  ["Changelog", "/changelog"],
];

export const FOOTER_COLS: { title: string; links: [string, string][] }[] = [
  {
    title: "Product",
    links: [
      ["How it works", "/how-it-works"],
      ["Product demo", "/demo"],
      ["Pricing", "/pricing"],
      ["Download", "/download"],
      ["Early users", "/early-users"],
      ["Changelog", "/changelog"],
    ],
  },
  {
    title: "Features",
    links: [
      ["Universal Search", "/universal-search"],
      ["Context Graph", "/context-graph"],
      ["Daily Brief", "/daily-brief"],
      ["AI on your terms", "/#ai"],
    ],
  },
  {
    title: "Workspace",
    links: [
      ["Notes", "/features/notes"],
      ["Tasks", "/features/tasks"],
      ["Journal", "/features/journal"],
      ["A tour of the app", "/#tour"],
      ["Integrations", "/integrations"],
      ["Get the Android app", "/download"],
    ],
  },
  {
    title: "Trust",
    links: [
      ["Privacy & Security", "/privacy-security"],
      ["Privacy Policy", "/privacy"],
      ["Terms & Conditions", "/terms"],
      ["Refund & Cancellation", "/refund-policy"],
      ["Contact", "/contact"],
      ["FAQ", "/faq"],
    ],
  },
];

export type MegaItem = {
  href: string;
  t: string;
  d: string;
  icon: IconDefinition;
  tone?: string;
  kind?: string;
  tags?: string[];
  /** The app screen shown in the menu's picture column while this item is hovered (a file under /public/mobile). */
  shot?: string;
};

/** The screen the menu's picture column shows before anything is hovered, and for items without a screen of their own. */
export const MEGA_DEFAULT_SHOT = "/mobile/home-2.png";

/** Content of the "Features" mega menu */
export const MEGA: { featured: MegaItem[]; workspace: MegaItem[]; explore: MegaItem[] } = {
  featured: [
    {
      href: "/universal-search",
      t: "Universal Search",
      d: "Find anything across notes, tasks, mail and meetings from one box.",
      icon: faMagnifyingGlass,
      tone: "blue",
      kind: "search",
      tags: ["Notes", "Mail", "Meetings", "Works without AI"],
    },
    {
      href: "/context-graph",
      t: "Context Graph",
      d: "See how your notes, threads, meetings and tasks connect.",
      icon: faCircleNodes,
      tone: "violet",
      kind: "graph",
      tags: ["Backlinks", "Atlas", "Context"],
    },
    {
      href: "/daily-brief",
      t: "Daily Brief",
      d: "Start the day with events, tasks and mail on one page.",
      icon: faNewspaper,
      tone: "amber",
      kind: "brief",
      tags: ["Calendar", "Tasks", "AI optional"],
    },
  ],
  workspace: [
    { href: "/features/journal", t: "Journal", d: "A private record of your days", icon: faBookOpen, shot: "/mobile/journal-2.png" },
    { href: "/features/notes", t: "Notes", d: "Think, write and organize", icon: faPenToSquare, shot: "/mobile/notes-2.png" },
    { href: "/features/tasks", t: "Tasks", d: "Plan your day, then do it", icon: faListCheck, shot: "/mobile/todo-2.png" },
    { href: "/#workspace", t: "Email", d: "Gmail in the workspace, on the way", icon: faEnvelope },
    { href: "/#workspace", t: "Calendar", d: "One view of your time", icon: faCalendarDays, shot: "/mobile/calendar.png" },
    { href: "/#workspace", t: "Meetings", d: "Capture, transcribe, follow through, on the way", icon: faMicrophone },
    { href: "/integrations", t: "Integrations", d: "Connect the tools you use", icon: faPlug, shot: "/mobile/connect.png" },
  ],
  explore: [
    { href: "/how-it-works", t: "How it works", d: "", icon: faRoute },
    { href: "/pricing", t: "Pricing", d: "", icon: faTag },
    { href: "/privacy-security", t: "Privacy & Security", d: "", icon: faShieldHalved },
    { href: "/early-users", t: "Early users", d: "", icon: faSeedling },
    { href: "/changelog", t: "Changelog", d: "", icon: faClockRotateLeft },
  ],
};
