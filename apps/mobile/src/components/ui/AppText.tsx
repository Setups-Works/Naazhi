import { Text, type TextProps, type TextStyle } from "react-native";

import { Font, Palette } from "@/constants/theme";

type Variant = "display" | "title" | "heading" | "body" | "bodyStrong" | "small" | "label";

const variants: Record<Variant, TextStyle> = {
  display: { ...Font.serif, fontSize: 38, lineHeight: 42, letterSpacing: -1.1 },
  title: { ...Font.serif, fontSize: 30, lineHeight: 34, letterSpacing: -0.8 },
  heading: { ...Font.serif, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  body: { ...Font.sans, fontSize: 15, lineHeight: 22 },
  bodyStrong: { ...Font.sansMedium, fontSize: 15, lineHeight: 22 },
  small: { ...Font.sans, fontSize: 13, lineHeight: 18 },
  // Small uppercase section label (.ap-sec on the web).
  label: { ...Font.sansMedium, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
};

const defaultColor = (): Record<Variant, string> => ({
  display: Palette.fg,
  title: Palette.fg,
  heading: Palette.fg,
  body: Palette.fg,
  bodyStrong: Palette.fg,
  small: Palette.fgMuted,
  label: Palette.fgFaint,
});

export type AppTextProps = TextProps & { variant?: Variant; color?: string; align?: TextStyle["textAlign"] };

export function AppText({ variant = "body", color, align, style, ...rest }: AppTextProps) {
  return (
    <Text {...rest} style={[variants[variant], { color: color ?? defaultColor()[variant] }, align ? { textAlign: align } : null, style]} />
  );
}
