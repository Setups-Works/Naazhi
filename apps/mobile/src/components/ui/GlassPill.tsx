import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Platform, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

import { Radius } from "@/constants/theme";

type Props = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  /** False keeps the caller's own fill (a selected, dark pill) and draws no glass. */
  glass?: boolean;
};

/**
 * A pressable that is liquid glass on iOS 26 (the same material as the cards and the tab bar) and keeps its translucent fill and
 * white ring everywhere else. Give it the pill's layout and its fallback colours as `style`; the glass is a layer behind the
 * content, so any shape and size works.
 */
export function GlassPill({ style, glass = true, children, ...rest }: Props) {
  const liquid = glass && Platform.OS === "ios" && isLiquidGlassAvailable();
  return (
    <Pressable
      {...rest}
      style={(state) => [
        typeof style === "function" ? style(state) : style,
        liquid ? styles.clear : null,
        glass ? { overflow: "hidden" } : null,
      ]}
    >
      {(state) => (
        <>
          {liquid ? <GlassView isInteractive glassEffectStyle="regular" pointerEvents="none" style={styles.layer} /> : null}
          {typeof children === "function" ? children(state) : children}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  clear: { backgroundColor: "transparent" },
  layer: { ...StyleSheet.absoluteFill as object, borderRadius: Radius.pill },
});
