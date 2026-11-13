import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Animated, Easing, Pressable } from "react-native";

import { Palette, themedStyles } from "@/constants/theme";
import { useRuntimePrefs } from "@/lib/preferences";

type Props = { value: boolean; onValueChange: (v: boolean) => void; accessibilityLabel?: string; disabled?: boolean };

/**
 * The web's switch (`components/ui/switch.tsx`): a pill track, ink when on and a hairline grey when off, with a paper thumb that slides.
 * Sized up from the web's 32×18 to a 46×28 touch target.
 */
export function Switch({ value, onValueChange, accessibilityLabel, disabled }: Props) {
  const reduce = useRuntimePrefs().reduceMotion;
  const [t] = useState(() => new Animated.Value(value ? 1 : 0));
  useEffect(() => {
    if (reduce) return t.setValue(value ? 1 : 0);
    Animated.timing(t, { toValue: value ? 1 : 0, duration: 140, easing: Easing.bezier(0.2, 0.7, 0.2, 1), useNativeDriver: false }).start();
  }, [value, reduce, t]);

  const left = t.interpolate({ inputRange: [0, 1], outputRange: [3, 21] });
  const bg = t.interpolate({ inputRange: [0, 1], outputRange: [Palette.lineStrong, Palette.fillDark] });
  const thumb = t.interpolate({ inputRange: [0, 1], outputRange: [Palette.surface, Palette.onDark] });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        void Haptics.selectionAsync().catch(() => undefined);
        onValueChange(!value);
      }}
      style={disabled ? styles.disabled : null}
    >
      <Animated.View style={[styles.track, { backgroundColor: bg }]}>
        <Animated.View style={[styles.thumb, { left, backgroundColor: thumb }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  track: { width: 46, height: 28, borderRadius: 14 },
  thumb: { position: "absolute", top: 3, width: 22, height: 22, borderRadius: 11 },
  disabled: { opacity: 0.5 },
}));
