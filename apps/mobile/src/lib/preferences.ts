import { ACCENTS, SCHEMES, type Accent, type Scheme } from "@/constants/theme";
import { useSyncExternalStore } from "react";

export type WriteTone = "direct" | "warm" | "formal" | "";
export const WRITE_TONES = ["direct", "warm", "formal"] as const;

/** Every preference the web keeps in `profiles.preferences` (apps/web/src/lib/prefs.ts); the phone must save them all back or it would wipe the web's. */
export type SettingsPrefs = {
  timeFormat: "12h" | "24h";
  defaultCategory: string;
  weekStart: "mon" | "sun";
  density: "comfortable" | "compact";
  reduceMotion: boolean;
  todoView: "today" | "inbox" | "upcoming";
  scheme: Scheme;
  accent: Accent;
  notesFullScreen: boolean;
  archiveCompleted: boolean;
  archiveCancelled: boolean;
  showEveryRepeat: boolean;
  homeTips: boolean;
  homeAnnouncements: boolean;
  undoSendSecs: number;
  replyAlerts: boolean;
  emailSignature: string;
  excludedLabels: { name: string; account: string }[];
  healthAssistant: boolean;
  role: string;
  writeTone: WriteTone;
  webBrief: boolean;
  /** Share anonymous usage with Firebase Analytics (screens and features used, never content). */
  analytics: boolean;
  recentImports: { at: string; source: string; notes: number; folders: number }[];
};

export const DEFAULT_SETTINGS_PREFS: SettingsPrefs = {
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
  healthAssistant: true,
  role: "",
  writeTone: "",
  webBrief: false,
  analytics: true,
  recentImports: [],
};

export const NOTE_CATEGORIES = ["Others", "Ideas & Creativity", "Personal", "Work", "Learning", "Health"] as const;

export function cleanSettingsPrefs(value: unknown): SettingsPrefs {
  const o = (value && typeof value === "object" ? value : {}) as Partial<SettingsPrefs>;
  const d = DEFAULT_SETTINGS_PREFS;
  return {
    timeFormat: o.timeFormat === "24h" ? "24h" : "12h",
    defaultCategory:
      typeof o.defaultCategory === "string" && NOTE_CATEGORIES.includes(o.defaultCategory as (typeof NOTE_CATEGORIES)[number]) ? o.defaultCategory : d.defaultCategory,
    weekStart: o.weekStart === "sun" ? "sun" : "mon",
    density: o.density === "compact" ? "compact" : "comfortable",
    reduceMotion: o.reduceMotion === true,
    todoView: o.todoView === "inbox" || o.todoView === "upcoming" ? o.todoView : "today",
    scheme: SCHEMES.includes(o.scheme as Scheme) ? (o.scheme as Scheme) : d.scheme,
    accent: ACCENTS.includes(o.accent as Accent) ? (o.accent as Accent) : d.accent,
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

let runtimePrefs = DEFAULT_SETTINGS_PREFS;
const listeners = new Set<() => void>();

/** Sync mirror for plain date helpers that cannot read React context. */
export function updateRuntimePrefs(prefs: SettingsPrefs) {
  runtimePrefs = prefs;
  listeners.forEach((listener) => listener());
}

export function getRuntimePrefs() {
  return runtimePrefs;
}
export function useRuntimePrefs() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getRuntimePrefs,
    () => DEFAULT_SETTINGS_PREFS,
  );
}
