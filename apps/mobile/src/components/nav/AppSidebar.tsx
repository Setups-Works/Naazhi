import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { activeNavKey, NAV } from "./navItems";
import { AppText } from "@/components/ui/AppText";
import { BrandMark } from "@/components/ui/BrandMark";
import { Icon, type IconName } from "@/components/ui/Icon";
import { applyLook, Font, LOOK, Palette, Radius, Space, themedStyles } from "@/constants/theme";
import { useBilling } from "@/features/billing/queries";
import { useInbox } from "@/features/notifications/queries";
import { useTasks } from "@/features/tasks/queries";
import { isoDate } from "@/lib/dates";
import { sidebarWidth } from "@/lib/layout";
import { useAppState } from "@/providers/AppState";

/** The web sidebar lists these nine; Reader is a page inside Workspace there, so it lights Workspace here too. */
const ROWS = NAV.filter((n) => n.key !== "reader");

const tap = () => void Haptics.selectionAsync().catch(() => undefined);

/** One row of the sidebar (`ROW` on the web): icon and label, 44 dp tall for a finger, the icon alone in the rail. */
function Row({ icon, title, on, rail, badge, logo, onPress }: { icon: IconName; title: string; on?: boolean; rail: boolean; badge?: number; logo?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected: !!on }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, rail ? styles.rowRail : null, on ? styles.rowOn : null, pressed ? styles.pressed : null]}
    >
      <View style={styles.rowIcon}>{logo ? <BrandMark size={16} on="page" /> : <Icon name={icon} size={15} color={on ? Palette.fg : Palette.fgMuted} />}</View>
      {rail ? null : (
        <AppText variant="body" color={on ? Palette.fg : Palette.fgMuted} numberOfLines={1} style={styles.rowText}>
          {title}
        </AppText>
      )}
      {!rail && badge ? (
        <AppText variant="small" color={Palette.rec} style={styles.badge}>
          {badge}
        </AppText>
      ) : null}
    </Pressable>
  );
}

/** A square icon button of the footer row (`ap-icon` on the web). */
function IconButton({ icon, label, dot, onPress }: { icon: IconName; label: string; dot?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.iconBtn, pressed ? styles.pressed : null]}
    >
      <Icon name={icon} size={15} color={Palette.fgSubtle} />
      {dot ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

/**
 * The web's sidebar (`apps/web/src/components/app/AppNav.tsx`) for tablets, in the same order and with the same parts: brand and the
 * collapse button, Search, the nine sections (the due count beside To-do), and a one-row footer with theme, settings, notifications,
 * the plan and your picture. It sits beside the pages (the root layout gives them the rest of the window), so the floating navbar is
 * not drawn. `collapsed` shrinks it to the icon rail.
 */
export function AppSidebar({ pathname, view, collapsed, onToggle }: { pathname: string; view?: string; collapsed: boolean; onToggle: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user } = useAppState();
  const tasks = useTasks().data;
  const unread = useInbox().data?.unread ?? 0;
  const billing = useBilling().data;
  const key = activeNavKey(pathname, view);
  const current = key === "reader" ? "workspace" : key;
  const today = isoDate();
  const dueCount = (tasks ?? []).filter((t) => !t.done && !t.cancelled && !t.archived && t.due_date && t.due_date <= today).length;
  const planLabel = billing ? (billing.plan && billing.status !== "none" ? billing.plan.name : "Free") : null;
  const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <View
      accessibilityLabel="Sidebar"
      style={[styles.wrap, { width: sidebarWidth(width, collapsed), paddingTop: Math.max(insets.top, Space.sm) + 2, paddingBottom: Math.max(insets.bottom, Space.sm), paddingLeft: Math.max(insets.left, 0) + (collapsed ? 6 : 10), paddingRight: collapsed ? 6 : 10 }]}
    >
      <View style={[styles.top, collapsed ? styles.topRail : null]}>
        {collapsed ? null : (
          <Pressable accessibilityRole="link" accessibilityLabel="Home" onPress={() => router.navigate("/home")} style={styles.brand}>
            <BrandMark size={22} on="page" />
            <AppText variant="heading" style={styles.wordmark}>
              Naazhi
            </AppText>
          </Pressable>
        )}
        <IconButton icon="table-columns" label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onPress={onToggle} />
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        <Row icon="magnifying-glass" title="Search" rail={collapsed} onPress={() => router.push("/search")} />
        {ROWS.map((n) => (
          <Row
            key={n.key}
            icon={n.icon}
            title={n.title}
            on={current === n.key}
            rail={collapsed}
            logo={n.key === "chat"}
            badge={n.key === "todo" ? dueCount : undefined}
            onPress={() => router.navigate(n.href)}
          />
        ))}
      </ScrollView>

      <View style={[styles.foot, collapsed ? styles.footRail : null]}>
        <IconButton icon={Palette.dark ? "moon" : "sun"} label={Palette.dark ? "Switch to light theme" : "Switch to dark theme"} onPress={() => applyLook({ scheme: Palette.dark ? "light" : "dark", accent: LOOK.accent })} />
        <IconButton icon="gear" label="Settings" onPress={() => router.push("/profile")} />
        <IconButton icon="bell" label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"} dot={unread > 0} onPress={() => router.push("/notifications")} />
        {!collapsed && planLabel ? (
          <View style={styles.plan}>
            <AppText variant="small" color={Palette.fgMuted} numberOfLines={1} style={styles.planText}>
              {planLabel}
            </AppText>
          </View>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel={`Account, ${user?.name ?? "profile"}`} onPress={() => router.push("/profile")} style={({ pressed }) => [styles.avatar, pressed ? styles.pressed : null]}>
          <AppText variant="small" color={Palette.fg} style={styles.avatarText}>
            {initial}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  // The web's `--side` surface with a hairline on its right edge.
  wrap: { backgroundColor: Palette.surfaceMuted, borderRightWidth: 1, borderRightColor: Palette.line },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 40, marginBottom: Space.sm },
  topRail: { justifyContent: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 9, paddingLeft: 6, minHeight: 36 },
  wordmark: { ...Font.brand, fontSize: 21, lineHeight: 24, letterSpacing: -0.4 },
  list: { flex: 1 },
  listContent: { gap: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44, paddingHorizontal: 9, borderRadius: Radius.r2 },
  rowRail: { justifyContent: "center" },
  rowOn: { backgroundColor: Palette.activeTabPill, borderRadius: Radius.ctl },
  rowIcon: { width: 16, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, fontSize: 14.5, lineHeight: 20 },
  badge: { ...Font.sansMedium, fontSize: 12 },
  pressed: { opacity: 0.7 },
  foot: { flexDirection: "row", alignItems: "center", gap: 4, paddingTop: Space.sm, marginTop: Space.xs, borderTopWidth: 1, borderTopColor: Palette.line },
  footRail: { flexDirection: "column", alignItems: "center" },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: Radius.r1 },
  dot: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: Palette.rec },
  plan: { flex: 1, alignItems: "flex-end" },
  planText: { fontSize: 12, lineHeight: 16, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.r1, backgroundColor: Palette.activeTabPill, overflow: "hidden" },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: Palette.activeTabPill },
  avatarText: { ...Font.sansSemi, fontSize: 12, lineHeight: 14 },
}));
