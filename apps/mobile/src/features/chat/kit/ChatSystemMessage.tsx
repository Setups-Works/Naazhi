import { View } from "react-native";

import { Banner } from "@/components/ui/Banner";
import { themedStyles } from "@/constants/theme";

/** A notice from the app rather than from either side of the conversation (no AI selected, a failed send). */
export function ChatSystemMessage({ kind = "info", children }: { kind?: "info" | "error"; children: string }) {
  return (
    <View style={styles.pad}>
      <Banner kind={kind}>{children}</Banner>
    </View>
  );
}

const styles = themedStyles(() => ({ pad: { paddingHorizontal: 14, paddingTop: 8 } }));
