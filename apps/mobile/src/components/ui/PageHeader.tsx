import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "./AppText";
import { Icon } from "./Icon";
import { Palette, Space, themedStyles } from "@/constants/theme";

/** The web page header (`tdo-title`): big title, muted subtitle underneath, tools on the right, an optional back link above. */
export function PageHeader({ title, subtitle, right, onBack, backLabel }: { title: string; subtitle?: string; right?: ReactNode; onBack?: () => void; backLabel?: string }) {
  return (
    <View style={styles.wrap}>
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Back to ${backLabel ?? "previous"}`} hitSlop={12} onPress={onBack} style={styles.back}>
          <Icon name="chevron-left" size={12} color={Palette.fgMuted} />
          <AppText variant="small" color={Palette.fgMuted}>
            {backLabel ?? "Back"}
          </AppText>
        </Pressable>
      ) : null}
      <View style={styles.row}>
        <View style={styles.text}>
          <AppText variant="title" accessibilityRole="header" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? <AppText variant="small" color={Palette.fgSubtle}>{subtitle}</AppText> : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

/** Section header over hairline rows (the web `Section`): a small muted label, then the rows with no card around them. */
export function SectionLabel({ children }: { children: string }) {
  return (
    <AppText variant="small" color={Palette.fgSubtle} accessibilityRole="header" style={styles.section}>
      {children}
    </AppText>
  );
}

const styles = themedStyles(() => ({
  wrap: { gap: Space.sm },
  back: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", minHeight: 28 },
  row: { flexDirection: "row", alignItems: "center", gap: Space.md },
  text: { flex: 1, gap: 4 },
  right: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  section: { marginTop: Space.sm, marginBottom: -Space.xs },
}));
