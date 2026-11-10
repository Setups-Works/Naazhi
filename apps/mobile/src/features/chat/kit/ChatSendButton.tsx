import { Pressable, StyleSheet } from "react-native";

import { Icon } from "@/components/ui/Icon";
import { Palette, Radius } from "@/constants/theme";

/** The round send arrow: dark when there is something to send. */
export function ChatSendButton({ enabled, onPress }: { enabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Send message"
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      style={[styles.send, enabled ? styles.on : null]}
    >
      <Icon name="arrow-up" size={18} color={enabled ? Palette.onDark : Palette.fgFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  send: { width: 46, height: 46, borderRadius: Radius.pill, backgroundColor: Palette.glassHi, alignItems: "center", justifyContent: "center" },
  on: { backgroundColor: Palette.fillDark },
});
