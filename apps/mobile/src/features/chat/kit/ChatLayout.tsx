import type { ReactNode } from "react";
import { KeyboardAvoidingView, View } from "react-native";

import { Palette, ReadingWidth, themedStyles } from "@/constants/theme";

/**
 * The chat body: the messages fill the screen, the composer sits under them and rides above the keyboard. On a tablet the whole column
 * (messages and composer) stays at a comfortable reading width, centred, instead of stretching across the screen.
 * Android draws edge to edge, so `softwareKeyboardLayoutMode` is ignored there and the keyboard would cover the composer: padding is needed on both platforms.
 */
export function ChatLayout({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <View style={styles.column}>
          {children}
          {footer}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = themedStyles(() => ({
  safe: { flex: 1, backgroundColor: Palette.page },
  flex: { flex: 1 },
  column: { flex: 1, width: "100%", maxWidth: ReadingWidth, alignSelf: "center" },
}));
