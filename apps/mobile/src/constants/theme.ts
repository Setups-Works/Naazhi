// design-ok-file: React Native styles cannot read the web app's CSS custom properties, so this file mirrors them once.
// Source of truth: `:root` in apps/web/src/app/globals.css. Every other mobile file must use these tokens, never a literal colour.
import type { Tone } from "@untitled/types";
import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";
import { Appearance, Platform, StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from "react-native";

export type Scheme = "system" | "light" | "cream" | "dark";
export type Accent = "default" | "ocean" | "grove" | "iris" | "rose" | "teal" | "slate";
export const SCHEMES: Scheme[] = ["system", "light", "cream", "dark"];
export const ACCENTS: Accent[] = ["default", "ocean", "grove", "iris", "rose", "teal", "slate"];

const LOOK_KEY = "naazhi.look";

type Look = { scheme: Scheme; accent: Accent };

/** A copy of the web's Appearance choice lives in the secure store so it is there before any screen draws. */
function readLook(): Look {
  try {
    const raw = Platform.OS === "web" ? globalThis.localStorage?.getItem(LOOK_KEY) : SecureStore.getItem(LOOK_KEY);
    const v = raw ? (JSON.parse(raw) as { scheme?: string; accent?: string }) : {};
    return {
      scheme: SCHEMES.includes(v.scheme as Scheme) ? (v.scheme as Scheme) : "light",
      accent: ACCENTS.includes(v.accent as Accent) ? (v.accent as Accent) : "default",
    };
  } catch {
    return { scheme: "light", accent: "default" };
  }
}

function saveLook(look: Look) {
  try {
    const raw = JSON.stringify(look);
    if (Platform.OS === "web") globalThis.localStorage?.setItem(LOOK_KEY, raw);
    else SecureStore.setItem(LOOK_KEY, raw);
  } catch {
    /* not remembered on this device */
  }
}

type Rgb = [number, number, number];
const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
const hex = (c: Rgb) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const mix = (a: string, b: string, share: number) => {
  const x = rgb(a);
  const y = rgb(b);
  return hex(x.map((v, i) => v * share + y[i]! * (1 - share)) as Rgb);
};

// The web's raw palette per scheme (`:root`, `:root.cream`, `:root.dark` in globals.css).
const BASES = {
  light: { paper: "#ffffff", side: "#f7f7f7", raised: "#ffffff", sunken: "#f0f0f0", ink: "#242424", ink2: "#5c5c5c", ink3: "#707070", ink4: "#8f8f8f", line: "#ebebeb", line2: "#dedede", wash: "36,36,36", veil: "255,255,255" },
  cream: { paper: "#f5f4eb", side: "#efeee5", raised: "#fbfaf5", sunken: "#e9e8de", ink: "#23221e", ink2: "#5b5a54", ink3: "#6b6a63", ink4: "#89887f", line: "#e4e3da", line2: "#d5d4cb", wash: "35,34,30", veil: "245,244,235" },
  dark: { paper: "#191919", side: "#202020", raised: "#232323", sunken: "#2b2b2b", ink: "#ebebeb", ink2: "#b3b3b3", ink3: "#8a8a8a", ink4: "#737373", line: "#2e2e2e", line2: "#3a3a3a", wash: "235,235,235", veil: "25,25,25" },
};

const ACCENT_COLOR: Record<Exclude<Accent, "default">, [light: string, dark: string]> = {
  ocean: ["#2f6fd0", "#6aa5f5"],
  grove: ["#2e7d4f", "#55b783"],
  iris: ["#6a4fd6", "#a08cf6"],
  rose: ["#c0396f", "#ee78a6"],
  teal: ["#0f7c78", "#4cc0b9"],
  slate: ["#4f6077", "#9fb0c6"],
};
/** The accent swatches the Appearance picker shows (the light-scheme colours). */
export const ACCENT_SWATCH: Record<Accent, string> = { default: "#242424", ocean: "#2f6fd0", grove: "#2e7d4f", iris: "#6a4fd6", rose: "#c0396f", teal: "#0f7c78", slate: "#4f6077" };

const F = { blue: "#5b7fa6", green: "#6f8f62", amber: "#c2923a", red: "#b9614f", violet: "#8a73a8", pink: "#b86e8c", slate: "#7a8088" };

const resolve = (scheme: Scheme): "light" | "cream" | "dark" => (scheme === "system" ? (Appearance.getColorScheme() === "dark" ? "dark" : "light") : scheme);

function buildPalette(look: Look) {
  const scheme = resolve(look.scheme);
  const dark = scheme === "dark";
  const B = BASES[scheme];
  const accent = look.accent === "default" ? B.ink : ACCENT_COLOR[look.accent][dark ? 1 : 0];
  return {
    page: B.paper,
    surface: B.raised,
    surfaceMuted: B.side,
    surfaceSunken: B.sunken,
    surfaceAccent: B.side,
    // As on the web, ink stays ink whatever the accent is (buttons, your chat bubbles); the accent only tints links, progress and highlights.
    fillDark: B.ink,
    onDark: B.paper,
    white: "#ffffff",
    fg: B.ink,
    fgMuted: B.ink2,
    fgSubtle: B.ink3,
    fgFaint: B.ink4,
    line: B.line,
    lineStrong: B.line2,
    glass: B.raised,
    glassHi: B.side,
    glassRing: B.line,
    // "greenFg" is the accent: ink by default, as on the web (the name stays so every screen keeps working).
    greenBg: look.accent === "default" ? B.sunken : mix(accent, B.paper, 0.1),
    greenFg: accent,
    greenLine: B.line2,
    clayBg: mix(F.red, B.raised, 0.13),
    clayFg: mix(F.red, B.ink, 0.78),
    orangeFg: dark ? "#e07050" : "#b5593a",
    rec: dark ? "#f47682" : "#bc2a41",
    success: dark ? "#3dba77" : "#2d8659",
    data: dark ? "#7dbbe8" : "#2f7ab0",
    shadow: "#000000",
    scrim: dark ? "rgba(0,0,0,0.60)" : "rgba(36,36,36,0.40)",
    scrimLight: `rgba(${B.veil},0.86)`,
    glassAndroid: B.raised,
    activeTabPill: `rgba(${B.wash},0.08)`,
    dark,
  };
}

function buildTints(look: Look): Record<Tone, { bg: string; line: string; fg: string }> {
  const B = BASES[resolve(look.scheme)];
  const tint = (f: string) => ({ bg: mix(f, B.raised, 0.13), line: `rgba(${rgb(f).join(",")},0.28)`, fg: mix(f, B.ink, 0.78) });
  return {
    sand: tint(F.slate),
    violet: tint(F.violet),
    blue: tint(F.blue),
    amber: tint(F.amber),
    gold: tint(F.pink),
    mint: { bg: mix(F.green, mix(F.blue, B.raised, 0.06), 0.08), line: `rgba(${rgb(F.green).join(",")},0.26)`, fg: mix(F.green, mix(F.blue, B.ink, 0.4), 0.6) },
    green: tint(F.green),
    clay: tint(F.red),
  };
}

/** The look in use right now (a "system" scheme follows the phone). */
export const LOOK: Look = readLook();

/**
 * Live colours. These are plain objects that `applyLook` rewrites in place, so any code reading `Palette.fg` while it renders (or while
 * `themedStyles` rebuilds a screen's styles) sees the current scheme. The app re-draws after a change (see ThemeProvider).
 */
export const Palette = buildPalette(LOOK);
export const Tints = buildTints(LOOK);

/** A tint-shaped pair of plain greys, for things that used to be coloured only for decoration (the web uses ink and hairlines there). */
const buildNeutral = () => ({ bg: Palette.surfaceMuted, line: Palette.line, fg: Palette.fgMuted });
export const Neutral = buildNeutral();

/** Task priorities 1–5 (5 is none), coloured like the web's priority flags. */
export const PriorityColor: Record<number, string> = {};
const paintPriorities = () => Object.assign(PriorityColor, { 1: Palette.rec, 2: Palette.orangeFg, 3: Palette.fgSubtle, 4: Tints.blue.fg, 5: Palette.fgFaint });
paintPriorities();

let version = 0;
const listeners = new Set<() => void>();

/** Switches scheme and accent now, remembers them on this phone, and tells the app to re-draw. */
export function applyLook(next: Look) {
  if (next.scheme === LOOK.scheme && next.accent === LOOK.accent) return;
  Object.assign(LOOK, next);
  saveLook(next);
  Object.assign(Palette, buildPalette(next));
  const t = buildTints(next);
  for (const k of Object.keys(t) as Tone[]) Object.assign(Tints[k], t[k]);
  Object.assign(Neutral, buildNeutral());
  paintPriorities();
  version += 1;
  listeners.forEach((l) => l());
}

// Lets the look be switched from a debugger console while developing.
if (__DEV__) (globalThis as { __applyLook?: typeof applyLook }).__applyLook = applyLook;

/** Changes whenever the look does; the app root uses it as a React key so every screen draws with the new colours. */
export function useThemeVersion() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
    () => version,
  );
}

/** A screen's styles, rebuilt the first time they are read after the look changes. Use it where `StyleSheet.create` used to be. */
type AnyStyle = ViewStyle | TextStyle | ImageStyle;
export function themedStyles<T extends Record<string, AnyStyle>>(factory: () => T | { [K in keyof T]: AnyStyle }): T {
  let built: T | null = null;
  let at = -1;
  return new Proxy({} as T, {
    get(_, key: string) {
      if (!built || at !== version) {
        built = StyleSheet.create(factory() as T);
        at = version;
      }
      return built[key as keyof T];
    },
  });
}

/** Follows the phone's light/dark switch while the scheme is "system". */
export function watchSystemScheme() {
  const sub = Appearance.addChangeListener(() => {
    if (LOOK.scheme !== "system") return;
    const keep = { ...LOOK };
    Object.assign(LOOK, { scheme: "light" }); // force a rebuild even though the stored choice is unchanged
    applyLook(keep);
  });
  return () => sub.remove();
}

/** The order tints are handed out in when a list of cards has no colour of its own (notes, journal days…). */
export const TONE_CYCLE: Tone[] = ["violet", "mint", "amber", "blue", "clay", "gold", "green", "sand"];
export const toneAt = (i: number): Tone => TONE_CYCLE[((i % TONE_CYCLE.length) + TONE_CYCLE.length) % TONE_CYCLE.length]!;

/** A tint as a translucent colour for the glass effect (the pastel background at about 60% strength). */
export const glassTint = (tone: Tone) => `${Tints[tone].bg}99`;


/** The web radii: controls 8, tiles 10, cards 12, dialogs 16 (`--r-ctl`, `--r1…r5` in globals.css). Pills stay for chips and avatars only. */
export const Radius = { ctl: 8, r1: 8, r2: 10, r3: 12, r4: 16, r5: 14, pill: 999 } as const;
export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/**
 * Font styles to spread into a StyleSheet: Geist for UI, Instrument Serif for display, as on the web.
 * The family names match the fonts registered in the root layout.
 */
export const Font = {
  // The display role is Geist 600 now (as on the web); Instrument Serif stays only for the Naazhi wordmark.
  serif: { fontFamily: "Geist_600SemiBold" },
  serifItalic: { fontFamily: "Geist_600SemiBold" },
  brand: { fontFamily: "InstrumentSerif_400Regular" },
  sans: { fontFamily: "Geist_400Regular" },
  sansMedium: { fontFamily: "Geist_500Medium" },
  sansSemi: { fontFamily: "Geist_600SemiBold" },
  // System monospace (the web uses Geist Mono for code); no extra font to download.
  mono: { fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }) },
} as const;

/** Soft drop shadows (--e1…--e3). */
export const Shadow = {
  e1: { shadowColor: Palette.shadow, shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  e2: { shadowColor: Palette.shadow, shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
} as const;

export const MaxContentWidth = 640;

/**
 * Screen-size classes, by the window's width in dp (so a tablet in portrait, a phone in landscape and a split-screen window each get
 * the class that fits what is on screen): compact is a phone upright, medium a large phone sideways or a tablet upright, expanded a tablet
 * sideways or any wide window.
 */
export const Breakpoint = { medium: 600, expanded: 900 } as const;

/** How wide the content column may grow in each class; a list never stretches wider than it reads. */
export const ContentWidth = { compact: MaxContentWidth, medium: 720, expanded: 1040 } as const;

/** Tablets (the window is at least this wide and tall) get the web's sidebar instead of the floating navbar. Widths follow the web: 280 dp, 240 dp on a window under 1024 (an iPad upright), and the collapsed icon rail. */
export const Sidebar = { minWidth: 700, minShort: 540, width: 280, narrow: 240, narrowBelow: 1024, rail: 56 } as const;

/** Narrower than a full page: sheets, dialogs and the chat's reading column. */
export const ReadingWidth = 720;
export const DialogWidth = 560;
