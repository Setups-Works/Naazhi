import type { WidgetTheme } from "@untitled/logic";
import { Appearance } from "react-native";

import { paletteFor, tintsFor } from "@/constants/theme";

/**
 * The widgets' colours, built from the app's own design tokens in one place (widgets can't import tokens; the app hands them over).
 * Naazhi green (docs/BRAND.md) leads: tonal green containers for Today and Quick write, the same tints as the app for Health and Journal.
 * Built at draw time from the phone's light/dark setting, so a widget redrawn in the background still matches the system.
 */
export function buildWidgetTheme(dark = Appearance.getColorScheme() === "dark"): WidgetTheme {
  const P = paletteFor(dark);
  const T = tintsFor(dark);
  return {
    page: P.page,
    surface: P.surface,
    fg: P.fg,
    fgMuted: P.fgMuted,
    fgSubtle: P.fgSubtle,
    accent: P.brand,
    onAccent: dark ? P.page : P.white,
    tones: {
      tasks: { bg: P.brandContainer, fg: P.onBrandContainer },
      quick: { bg: P.brandContainer, fg: P.onBrandContainer },
      health: { bg: T.mint.bg, fg: T.mint.fg },
      journal: { bg: T.violet.bg, fg: T.violet.fg },
    },
  };
}
