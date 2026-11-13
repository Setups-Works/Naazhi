import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { PanResponder, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ViewHandle } from "@/types/native";
import { AppText } from "@/components/ui/AppText";
import { BrandMark } from "@/components/ui/BrandMark";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Font, Palette, Radius, themedStyles } from "@/constants/theme";

/**
 * Only what the bar uses from the navigator, so it works with both router generations: Expo Router 57 hands the bar a `navigation`,
 * 58 hands it `navigateToTab`.
 */
type BarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation?: {
    emit: (e: { type: "tabPress"; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
  navigateToTab?: (routeKey: string) => void;
};

const SLOTS: { route: string; title: string; icon: IconName }[] = [
  { route: "home", title: "Home", icon: "house" },
  { route: "journal", title: "Journal", icon: "book-open" },
  { route: "todo", title: "Plan", icon: "list-check" },
];

/**
 * The floating navbar: a pill with Home, Journal, To-do and Menu (the web sidebar, with every other section), and the round
 * Naazhi AI button beside it. Content scrolls under it, so `Screen` leaves room at the bottom.
 */
/** Space the floating bar takes from the bottom of the screen, so the menu can sit just above it. */
export const barSpace = (bottomInset: number) => Math.max(bottomInset + 8, 16) + 58 + 10;

export function TabBar({ state, navigation, navigateToTab, onMenu, menuOpen }: BarProps & { onMenu: () => void; menuOpen?: boolean }) {
  const insets = useSafeAreaInsets();
  const focused = state.routes[state.index]?.name;

  const open = (route: string) => {
    const r = state.routes.find((x) => x.name === route);
    if (!r) return;
    void Haptics.selectionAsync().catch(() => undefined);
    if (navigateToTab) return navigateToTab(r.key);
    const event = navigation?.emit({ type: "tabPress", target: r.key, canPreventDefault: true });
    if (focused !== route && !event?.defaultPrevented) navigation?.navigate(route);
  };
  const chatOn = focused === "chat";

  // Drag a finger along the pill to pick a tab: the one under the finger lights up, and lifting the finger goes there.
  const pill = useRef<ViewHandle>(null);
  const [hover, setHover] = useState<number | null>(null);
  const count = SLOTS.length + 1; // the tabs and Menu
  // The gesture is made once, so it reads the latest props and the pill's position from this shared object.
  const [live] = useState(() => ({ left: 0, width: 1, open, onMenu, menuOpen, measure: (_done: () => void) => {} }));
  useEffect(() => {
    Object.assign(live, {
      open,
      onMenu,
      menuOpen,
      measure: (done: () => void) =>
        pill.current?.measureInWindow((x: number, _y: number, w: number) => {
          live.left = x;
          live.width = w || 1;
          done();
        }),
    });
  });
  const [drag] = useState(() => {
    const indexAt = (pageX: number) => Math.min(count - 1, Math.max(0, Math.floor(((pageX - live.left) / live.width) * count)));
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: (_, g) => {
        live.measure(() => setHover(indexAt(g.x0)));
      },
      onPanResponderMove: (_, g) => setHover(indexAt(g.moveX)),
      onPanResponderRelease: (_, g) => {
        const i = indexAt(g.moveX);
        setHover(null);
        if (i < SLOTS.length) live.open(SLOTS[i]!.route);
        else if (!live.menuOpen) live.onMenu();
      },
      onPanResponderTerminate: () => setHover(null),
    });
  });

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom + 8, 16) }]} pointerEvents="box-none">
      <View style={styles.row}>
        <View ref={pill} style={styles.pill} {...drag.panHandlers}>
          {SLOTS.map((s, i) => {
            const on = hover === null ? focused === s.route : hover === i;
            return (
              <Pressable
                key={s.route}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={s.title}
                onPress={() => open(s.route)}
                style={({ pressed }) => [styles.item, on ? styles.itemOn : null, pressed ? styles.pressed : null]}
              >
                <Icon name={s.icon} size={17} color={on ? Palette.fg : Palette.fgSubtle} />
                <AppText variant="small" color={on ? Palette.fg : Palette.fgSubtle} numberOfLines={1} style={[styles.label, on ? styles.labelOn : null]}>
                  {s.title}
                </AppText>
              </Pressable>
            );
          })}
          <Pressable accessibilityRole="button" accessibilityLabel={menuOpen ? "Close menu" : "Open menu"} accessibilityState={{ expanded: !!menuOpen }} onPress={onMenu} style={({ pressed }) => [styles.item, (hover === null ? menuOpen : hover === SLOTS.length) ? styles.itemOn : null, pressed ? styles.pressed : null]}>
            <Icon name={menuOpen ? "xmark" : "bars"} size={17} color={menuOpen ? Palette.fg : Palette.fgSubtle} />
            <AppText variant="small" color={menuOpen ? Palette.fg : Palette.fgSubtle} style={styles.label}>
              Menu
            </AppText>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: chatOn }}
          accessibilityLabel="Naazhi AI"
          onPress={() => open("chat")}
          style={({ pressed }) => [styles.chat, chatOn ? styles.chatOn : null, pressed ? styles.chatPressed : null]}
        >
          <BrandMark size={30} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center", paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", width: "100%", maxWidth: 420, gap: 10 },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 58,
    padding: 4,
    borderRadius: Radius.pill,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
  },
  item: { flex: 1, height: 48, alignItems: "center", justifyContent: "center", gap: 2, borderRadius: Radius.pill },
  itemOn: { backgroundColor: Palette.activeTabPill },
  pressed: { opacity: 0.7 },
  label: { fontSize: 11, lineHeight: 13 },
  labelOn: { ...Font.sansSemi },
  chat: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Palette.fillDark,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Palette.lineStrong,
  },
  chatOn: { borderColor: Palette.fg, borderWidth: 2 },
  chatPressed: { opacity: 0.85, transform: [{ scale: 0.95 }] },
}));
