import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Palette, Radius, Space, themedStyles } from "@/constants/theme";

type Props = {
  icon: IconName;
  title: string;
  /** Small grey text after the title ("today", "25 unread"). */
  hint?: string;
  /** Makes the "Open" link show; it goes to the full screen. */
  onOpen?: () => void;
  /** The drag grip from the reorderable list. */
  handle?: ReactNode;
  children: ReactNode;
};

/** The web Home's quiet glass panel: a small icon chip, a label, an optional "Open" link and the drag grip, then the content. */
export function HomePanel({ icon, title, hint, onOpen, handle, children }: Props) {
  return (
    <Card style={styles.card} accessibilityLabel={title}>
      <View style={styles.header}>
        <View style={styles.chip}>
          <Icon name={icon} size={13} color={Palette.fgMuted} />
        </View>
        <AppText variant="bodyStrong" accessibilityRole="header" style={styles.title}>
          {title}
        </AppText>
        {hint ? (
          <AppText variant="small" color={Palette.fgSubtle} numberOfLines={1} style={styles.hint}>
            {hint}
          </AppText>
        ) : null}
        <View style={styles.spacer} />
        {onOpen ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Open ${title}`} hitSlop={8} onPress={onOpen} style={styles.open}>
            <AppText variant="small" color={Palette.fgSubtle}>
              Open
            </AppText>
          </Pressable>
        ) : null}
        {handle}
      </View>
      {children}
    </Card>
  );
}

/** One quiet line for an empty panel. */
export function PanelEmpty({ children }: { children: ReactNode }) {
  return (
    <AppText variant="small" color={Palette.fgSubtle}>
      {children}
    </AppText>
  );
}

const styles = themedStyles(() => ({
  card: { padding: Space.lg, gap: Space.md },
  header: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  chip: {
    width: 28,
    height: 28,
    borderRadius: Radius.r1,
    backgroundColor: Palette.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 16, lineHeight: 22 },
  hint: { flexShrink: 1 },
  spacer: { flex: 1 },
  open: { minHeight: 32, paddingHorizontal: Space.sm, justifyContent: "center", borderRadius: Radius.pill },
}));
