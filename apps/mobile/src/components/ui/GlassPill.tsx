import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

type Props = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  /** Kept for existing callers; the paper-and-ink look has no glass layer. */
  glass?: boolean;
};

/** A plain pressable pill. The glass material is gone; callers still pass their own fill and ring. */
export function GlassPill({ style, glass: _glass, children, ...rest }: Props) {
  return (
    <Pressable {...rest} style={(state) => [typeof style === "function" ? style(state) : style, { overflow: "hidden" }]}>
      {children}
    </Pressable>
  );
}
