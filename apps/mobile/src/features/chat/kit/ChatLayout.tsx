import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";

import { Palette, ReadingWidth } from "@/constants/theme";

/**
 * The chat body: the messages fill the screen, the composer sits under them and rides above the keyboard. On a tablet the whole column
 * (messages and composer) stays at a comfortable reading width, centred, instead of stretching across the screen.
 */
export function ChatLayout({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.column}>
          {children}
          {footer}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.page },
  flex: { flex: 1 },
  column: { flex: 1, width: "100%", maxWidth: ReadingWidth, alignSelf: "center" },
});
