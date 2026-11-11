import { Children, type ReactNode } from "react";
import { View } from "react-native";
import { themedStyles } from "@/constants/theme";

/** The space above the text box that holds what is attached to the message (picture and audio previews). */
export function ChatComposerDrawer({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(Boolean);
  return items.length ? <View style={styles.drawer}>{items}</View> : null;
}

const styles = themedStyles(() => ({ drawer: { gap: 8, marginBottom: 8 } }));
