import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

/** One message row: the person's messages sit on the right, the assistant's on the left. */
export function ChatMessage({ role, children }: { role: "user" | "assistant"; children: ReactNode }) {
  return <View style={[styles.row, role === "user" ? styles.mine : styles.theirs]}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  mine: { justifyContent: "flex-end" },
  theirs: { justifyContent: "flex-start" },
});
