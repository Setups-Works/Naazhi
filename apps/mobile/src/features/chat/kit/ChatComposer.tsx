import type { ReactNode } from "react";
import { View } from "react-native";

import { GlassSurface } from "@/components/ui/GlassSurface";
import { Palette, Radius, themedStyles } from "@/constants/theme";

/** The composer: a flat grey card like the web's: the drawer above, the message box, then the toolbar (attach, AI choice, dictation, send). */
export function ChatComposer({ bottomInset, children }: { bottomInset: number; children: ReactNode }) {
  return (
    <View style={[styles.wrap, { paddingBottom: bottomInset }]}>
      <GlassSurface style={styles.card}>
        {children}
      </GlassSurface>
    </View>
  );
}

/** The row under the message box. */
export function ChatComposerToolbar({ children }: { children: ReactNode }) {
  return <View style={styles.bar}>{children}</View>;
}

const styles = themedStyles(() => ({
  wrap: { paddingHorizontal: 14, paddingTop: 8 },
  card: { borderRadius: Radius.r4, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, backgroundColor: Palette.surfaceMuted },
  bar: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
}));
