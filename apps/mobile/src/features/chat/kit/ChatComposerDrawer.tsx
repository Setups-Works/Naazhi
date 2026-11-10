import { Children, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

/** The space above the text box that holds what is attached to the message (picture and audio previews). */
export function ChatComposerDrawer({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(Boolean);
  return items.length ? <View style={styles.drawer}>{items}</View> : null;
}

const styles = StyleSheet.create({ drawer: { gap: 8, marginBottom: 8 } });
