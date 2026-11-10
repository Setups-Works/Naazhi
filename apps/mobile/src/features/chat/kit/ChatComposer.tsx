import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { GlassSurface } from "@/components/ui/GlassSurface";
import { Radius } from "@/constants/theme";

/** The composer's glass card: the drawer above, the message box, then the toolbar (attach, AI choice, dictation, send). */
export function ChatComposer({ bottomInset, children }: { bottomInset: number; children: ReactNode }) {
  return (
    <View style={[styles.wrap, { paddingBottom: bottomInset }]}>
      <GlassSurface tone="violet" style={styles.card}>
        {children}
      </GlassSurface>
    </View>
  );
}

/** The row under the message box. */
export function ChatComposerToolbar({ children }: { children: ReactNode }) {
  return <View style={styles.bar}>{children}</View>;
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 14, paddingTop: 8 },
  card: { borderRadius: Radius.r4, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 },
  bar: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
});
