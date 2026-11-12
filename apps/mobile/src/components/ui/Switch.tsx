import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Animated, Easing, Pressable } from "react-native";

import { Icon } from "./Icon";
import { Palette, themedStyles } from "@/constants/theme";
import { useRuntimePrefs } from "@/lib/preferences";

type Props = { value: boolean; onValueChange: (v: boolean) => void; accessibilityLabel?: string; disabled?: boolean };

/**
 * Material 3 switch: a 52×32 pill track. Off: a sunken track with an outline and a small 16 dp thumb. On: a brand-green track
 * and a larger 24 dp thumb carrying a check. The thumb grows and slides between the two.
 */
export function Switch({ value, onValueChange, accessibilityLabel, disabled }: Props) {
  const reduce = useRuntimePrefs().reduceMotion;
  const [t] = useState(() => new Animated.Value(value ? 1 : 0));
  useEffect(() => {
    if (reduce) return t.setValue(value ? 1 : 0);
    Animated.timing(t, { toValue: value ? 1 : 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [value, reduce, t]);

  const size = t.interpolate({ inputRange: [0, 1], outputRange: [16, 24] });
  const left = t.interpolate({ inputRange: [0, 1], outputRange: [6, 22] });
  const top = t.interpolate({ inputRange: [0, 1], outputRange: [8, 4] });
  const bg = t.interpolate({ inputRange: [0, 1], outputRange: [Palette.surfaceSunken, Palette.brand] });
  const edge = t.interpolate({ inputRange: [0, 1], outputRange: [Palette.fgFaint, Palette.brand] });
  const thumb = t.interpolate({ inputRange: [0, 1], outputRange: [Palette.fgSubtle, Palette.white] });

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
      <Animated.View style={[styles.track, { backgroundColor: bg, borderColor: edge }]}>
        <Animated.View style={[styles.thumb, { width: size, height: size, left, top, backgroundColor: thumb }]}>
          {value ? <Icon name="check" size={12} color={Palette.brand} /> : null}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  track: { width: 52, height: 32, borderRadius: 16, borderWidth: 2 },
  thumb: { position: "absolute", borderRadius: 16, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.45 },
}));
