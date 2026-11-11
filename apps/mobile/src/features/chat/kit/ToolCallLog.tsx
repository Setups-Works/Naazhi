import { ActivityIndicator, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { AppLogo, type LogoName } from "@/components/ui/AppLogo";
import { Icon } from "@/components/ui/Icon";
import { Palette, Radius, Space, themedStyles } from "@/constants/theme";

export type ToolCallState = "running" | "done" | "error";

/**
 * One line of the assistant's activity log, shown above what it fetched: the app's logo, what it is doing ("Getting data from Zoho
 * Books…") and how it ended (a spinner, a tick, or a warning). Read out as a polite status.
 */
export function ToolCallLog({ logo, state, text }: { logo: LogoName; state: ToolCallState; text: string }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLiveRegion="polite" accessibilityLabel={text} style={styles.row}>
      <AppLogo name={logo} size={28} />
      <AppText variant="small" color={Palette.fgMuted} numberOfLines={1} style={styles.text}>
        {text}
      </AppText>
      {state === "running" ? (
        <ActivityIndicator size="small" color={Palette.fgSubtle} />
      ) : state === "done" ? (
        <Icon name="check" size={12} color={Palette.fgSubtle} />
      ) : (
        <Icon name="triangle-exclamation" size={12} color={Palette.clayFg} />
      )}
    </View>
  );
}

const styles = themedStyles(() => ({
  row: { flexDirection: "row", alignItems: "center", gap: Space.sm, paddingVertical: 6, paddingLeft: 6, paddingRight: Space.md, borderRadius: Radius.r2, backgroundColor: Palette.surfaceMuted },
  text: { flex: 1 },
}));
