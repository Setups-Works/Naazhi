import type { Tone } from "@untitled/types";
import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { Palette, Radius, Tints, themedStyles } from "@/constants/theme";

type Props = { children: ReactNode; tone?: Tone | null; style?: StyleProp<ViewStyle>; liquidTint?: boolean; accessibilityLabel?: string };

/** Paper-and-ink card (the web's `ap-card`): a flat raised surface with a 1 px hairline; a tone swaps in the `at-<tint>` colours. */
export function GlassSurface({ children, tone, style, accessibilityLabel }: Props) {
  const t = tone ? Tints[tone] : null;
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[styles.base, { backgroundColor: t?.bg ?? Palette.surface, borderColor: t?.line ?? Palette.line }, style]}
    >
      {children}
    </View>
  );
}

const styles = themedStyles(() => ({
  base: { borderRadius: Radius.r3, borderWidth: 1, overflow: "hidden" },
}));
