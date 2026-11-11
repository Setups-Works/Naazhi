import type { ReactNode } from "react";
import { View } from "react-native";

import { GlassSurface } from "@/components/ui/GlassSurface";
import { Palette, Radius, themedStyles } from "@/constants/theme";

/** Your messages are solid ink; the assistant's are white with a hairline (as on the web). `wide` gives cards and drafts more room. */
export function ChatMessageBubble({ mine, wide, children }: { mine: boolean; wide?: boolean; children: ReactNode }) {
  if (mine) return <View style={[styles.bubble, styles.mine, wide ? styles.wide : null]}>{children}</View>;
  return (
    <GlassSurface style={[styles.bubble, styles.theirs, wide ? styles.wide : null]}>
      {children}
    </GlassSurface>
  );
}

const styles = themedStyles(() => ({
  bubble: { maxWidth: "86%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.r3, gap: 6 },
  wide: { width: "92%" },
  mine: { backgroundColor: Palette.fillDark, borderBottomRightRadius: 6 },
  theirs: { borderBottomLeftRadius: 6 },
}));
