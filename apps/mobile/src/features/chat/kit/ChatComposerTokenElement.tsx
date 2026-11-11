import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { Palette, Radius, themedStyles } from "@/constants/theme";

/** A small chip in the composer (a restored draft). With `onRemove` it has a button to dismiss it. */
export function ChatComposerTokenElement({ children, onRemove, removeLabel }: { children: ReactNode; onRemove?: () => void; removeLabel?: string }) {
  return (
    <View style={styles.chip}>
      <AppText variant="small" color={Palette.fgMuted} numberOfLines={1} style={styles.text}>
        {children}
      </AppText>
      {onRemove ? (
        <Pressable accessibilityRole="button" accessibilityLabel={removeLabel ?? "Remove"} hitSlop={8} onPress={onRemove} style={styles.x}>
          <Icon name="xmark" size={11} color={Palette.fgMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  chip: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 12, paddingRight: 4, minHeight: 28, borderRadius: Radius.pill, backgroundColor: Palette.surfaceMuted },
  text: { flexShrink: 1 },
  x: { width: 22, height: 22, borderRadius: Radius.pill, alignItems: "center", justifyContent: "center" },
}));
