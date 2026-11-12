import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Easing, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { activeNavKey, NAV } from "./navItems";
import { barSpace } from "./TabBar";
import { AppText } from "@/components/ui/AppText";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Font, Palette, Radius, themedStyles } from "@/constants/theme";
import { useRuntimePrefs } from "@/lib/preferences";

/** The navbar already shows these four; the menu lists the rest. */
const IN_BAR = ["home", "journal", "chat", "todo"];
const MORE = NAV.filter((n) => !IN_BAR.includes(n.key));

function Tile({ icon, title, on, onPress }: { icon: IconName; title: string; on?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected: !!on }}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, on ? styles.tileOn : null, pressed ? styles.tilePressed : null]}
    >
      <Icon name={icon} size={17} color={on ? Palette.fg : Palette.fgMuted} />
      <AppText variant="small" color={on ? Palette.fg : Palette.fgMuted} numberOfLines={1} style={on ? styles.tileTextOn : null}>
        {title}
      </AppText>
    </Pressable>
  );
}

/**
 * The web's sidebar as a menu that opens just above the floating navbar (the bar stays visible and tappable below it): every section as a
 * tile, then Search, Notifications, Settings and the account. Tapping outside closes it.
 */
export function NavMenu({ visible, onClose, pathname, view }: { visible: boolean; onClose: () => void; pathname: string; view?: string }) {
  const insets = useSafeAreaInsets();
  const prefs = useRuntimePrefs();
  const [t] = useState(() => new Animated.Value(0));
  const current = activeNavKey(pathname, view);
  const space = barSpace(insets.bottom);

  // Fades and lifts in when it opens; closing is immediate.
  useEffect(() => {
    if (!visible) return;
    if (prefs.reduceMotion) return t.setValue(1);
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [visible, prefs.reduceMotion, t]);

  if (!visible) return null;

  const go = (href: Parameters<typeof router.navigate>[0]) => {
    void Haptics.selectionAsync().catch(() => undefined);
    onClose();
    router.navigate(href);
  };

  return (
    <View style={styles.layer} pointerEvents="box-none">
      <Animated.View style={[styles.scrimWrap, { bottom: space, opacity: t }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close menu" onPress={onClose} style={styles.scrim} />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        accessibilityLabel="Menu"
        style={[styles.panel, { bottom: space, opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}
      >
        <View style={styles.grid}>
          {MORE.map((n) => (
            <Tile key={n.key} icon={n.icon} title={n.title} on={current === n.key} onPress={() => go(n.href)} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = themedStyles(() => ({
  layer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 20 },
  scrimWrap: { position: "absolute", top: 0, left: 0, right: 0 },
  // No dimming behind the menu: the page stays as it is, and a tap outside the menu only closes it.
  scrim: { flex: 1 },
  panel: {
    position: "absolute",
    left: 16,
    right: 16,
    alignSelf: "center",
    maxWidth: 420,
    width: "auto",
    padding: 10,
    gap: 8,
    borderRadius: Radius.r4,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    backgroundColor: Palette.surface,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tile: { width: "31.8%", flexGrow: 1, minHeight: 64, alignItems: "center", justifyContent: "center", gap: 6, borderRadius: Radius.r2, backgroundColor: Palette.surfaceMuted },
  tileOn: { backgroundColor: Palette.brandContainer },
  tilePressed: { opacity: 0.7 },
  tileTextOn: { ...Font.sansMedium },
}));
