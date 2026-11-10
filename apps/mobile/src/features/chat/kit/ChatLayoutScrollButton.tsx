import { StyleSheet } from "react-native";

import { GlassPill } from "@/components/ui/GlassPill";
import { Icon } from "@/components/ui/Icon";
import { Palette, Radius, Shadow } from "@/constants/theme";

/** Floats above the composer once the reader has scrolled up; jumps back to the newest message. */
export function ChatLayoutScrollButton({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  if (!visible) return null;
  return (
    <GlassPill accessibilityRole="button" accessibilityLabel="Jump to the latest message" onPress={onPress} style={styles.button}>
      <Icon name="arrow-down" size={15} color={Palette.fgMuted} />
    </GlassPill>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Palette.glassHi,
    borderWidth: 1,
    borderColor: Palette.glassRing,
    ...Shadow.e2,
  },
});
