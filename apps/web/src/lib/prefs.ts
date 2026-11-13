import { toDate } from "@untitled/logic";

export type Prefs = {
  timeFormat: "12h" | "24h";
  defaultCategory: string;
  weekStart: "mon" | "sun";
  density: "comfortable" | "compact";
  reduceMotion: boolean;
  todoView: "today" | "inbox" | "upcoming";
  /** Colour scheme of the app: paper white, warm cream, charcoal, or follow the device. */
  scheme: Scheme;
  /** Accent colour for links, focus and active states ("default" is ink). */
  accent: Accent;
  /** New notes open in the full width of the page instead of beside the list. */
  notesFullScreen: boolean;
  /** Finished tasks move to the archive straight away. */
  archiveCompleted: boolean;
  /** Cancelled tasks move to the archive straight away. */
  archiveCancelled: boolean;
  /** Upcoming lists every coming repeat of a repeating task, not just the next one. */
  showEveryRepeat: boolean;
  /** One short tip a day on Home. */
  homeTips: boolean;
  /** Product announcements on Home. */
  homeAnnouncements: boolean;
  /** Email: seconds to take a sent message back (2-60). */
  undoSendSecs: number;
  /** Email: a chat message when someone replies or a message bounces. */
  replyAlerts: boolean;
  /** Email: one signature added to every message. */
  emailSignature: string;
  /** Mail labels Naazhi never reads, per mail service. */
  excludedLabels: { name: string; account: string }[];
  /** Health: the chat assistant may read your synced health data. */
  healthAssistant: boolean;
  /** What the person does (optional). Naazhi's assistant uses it to tell what matters to them. */
  role: string;
  /** How the assistant should write for the person (optional). */
  writeTone: WriteTone;
  /** A browser notification with today's to-dos, once a day, while Naazhi is open (needs the browser's permission). */
  webBrief: boolean;
  /** Share anonymous usage (which screens and features are used, never note, journal or chat text) to improve the app. */
  analytics: boolean;
  /** The last few imports, newest first. */
  recentImports: { at: string; source: string; notes: number; folders: number }[];
};

export const WRITE_TONES = ["direct", "warm", "formal"] as const;
export type WriteTone = (typeof WRITE_TONES)[number] | "";

export const SCHEMES = ["system", "light", "cream", "dark"] as const;
export type Scheme = (typeof SCHEMES)[number];
export const ACCENTS = ["default", "ocean", "grove", "iris", "rose", "teal", "slate"] as const;
export type Accent = (typeof ACCENTS)[number];

export const DEFAULT_PREFS: Prefs = {
  timeFormat: "12h",
  defaultCategory: "Others",
  weekStart: "mon",
  density: "comfortable",
  reduceMotion: false,
  todoView: "today",
  scheme: "light",
  accent: "default",
  notesFullScreen: true,
  archiveCompleted: false,
  archiveCancelled: false,
  showEveryRepeat: false,
  homeTips: true,
  homeAnnouncements: true,
  undoSendSecs: 15,
  replyAlerts: true,
  emailSignature: "",
  excludedLabels: [],
  recentImports: [],
  healthAssistant: true,
  role: "",
  writeTone: "",
  webBrief: false,
  analytics: true,
};
const KEY = "up_prefs";

/** Preferences live in the user's profile (profiles.preferences); a copy in localStorage lets plain helpers (like time formatting) read them. */
export function cleanPrefs(v: unknown, categories: readonly string[]): Prefs {
  const o = (v && typeof v === "object" ? v : {}) as Partial<Prefs>;
  return {
    timeFormat: o.timeFormat === "24h" ? "24h" : "12h",
    defaultCategory:
      typeof o.defaultCategory === "string" && categories.includes(o.defaultCategory) ? o.defaultCategory : DEFAULT_PREFS.defaultCategory,
    weekStart: o.weekStart === "sun" ? "sun" : "mon",
    density: o.density === "compact" ? "compact" : "comfortable",
    reduceMotion: o.reduceMotion === true,
    todoView: o.todoView === "inbox" || o.todoView === "upcoming" ? o.todoView : "today",
    scheme: SCHEMES.includes(o.scheme as Scheme) ? (o.scheme as Scheme) : DEFAULT_PREFS.scheme,
    accent: ACCENTS.includes(o.accent as Accent) ? (o.accent as Accent) : DEFAULT_PREFS.accent,
    notesFullScreen: o.notesFullScreen !== false,
    archiveCompleted: o.archiveCompleted === true,
    archiveCancelled: o.archiveCancelled === true,
    showEveryRepeat: o.showEveryRepeat === true,
    homeTips: o.homeTips !== false,
    homeAnnouncements: o.homeAnnouncements !== false,
    undoSendSecs: Number.isInteger(o.undoSendSecs) && (o.undoSendSecs as number) >= 2 && (o.undoSendSecs as number) <= 60 ? (o.undoSendSecs as number) : 15,
    replyAlerts: o.replyAlerts !== false,
    emailSignature: typeof o.emailSignature === "string" ? o.emailSignature.slice(0, 2000) : "",
    excludedLabels: Array.isArray(o.excludedLabels)
      ? o.excludedLabels
          .filter((l): l is { name: string; account: string } => !!l && typeof l.name === "string" && typeof l.account === "string")
          .slice(0, 100)
          .map((l) => ({ name: l.name.slice(0, 80), account: l.account.slice(0, 30) }))
      : [],
    healthAssistant: o.healthAssistant !== false,
    role: typeof o.role === "string" ? o.role.replace(/\s+/g, " ").trim().slice(0, 80) : "",
    writeTone: WRITE_TONES.includes(o.writeTone as never) ? (o.writeTone as WriteTone) : "",
    webBrief: o.webBrief === true,
    analytics: o.analytics !== false,
    recentImports: Array.isArray(o.recentImports)
      ? o.recentImports
          .filter((r) => !!r && typeof r.at === "string" && typeof r.source === "string")
          .slice(0, 10)
          .map((r) => ({ at: r.at, source: r.source.slice(0, 30), notes: Number(r.notes) || 0, folders: Number(r.folders) || 0 }))
      : [],
  };
}

export function readPrefs(): Prefs {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Clock time of an ISO timestamp, in the user's 12h/24h preference. */
export function fmtTime(iso: string) {
  const d = toDate(iso);
  if (Number.isNaN(d.getTime())) return "";
  return readPrefs().timeFormat === "24h"
    ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
    : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
}

/** Days from the start of the user's week to `date` (0–6). */
export const weekdayIndex = (date: Date, start: Prefs["weekStart"] = readPrefs().weekStart) =>
  (date.getDay() - (start === "sun" ? 0 : 1) + 7) % 7;

/** Seven one-letter or short weekday labels starting on the user's first day of the week. */
export function weekdayLabels(style: "narrow" | "short" = "narrow", start: Prefs["weekStart"] = readPrefs().weekStart) {
  const first = start === "sun" ? 0 : 1;
  return Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 7 + first + i).toLocaleDateString(undefined, { weekday: style }));
}

export function writePrefs(p: Prefs) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable — preferences still save to the account */
  }
}
