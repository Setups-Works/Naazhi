import { StyleSheet, TextInput } from "react-native";

import { Font, Palette } from "@/constants/theme";

/** The message box: grows with the text up to about six lines. */
export function ChatComposerInput({ value, onChange, placeholder = "Ask anything…" }: { value: string; onChange: (text: string) => void; placeholder?: string }) {
  return (
    <TextInput
      accessibilityLabel="Message"
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={Palette.fgFaint}
      selectionColor={Palette.greenFg}
      multiline
      maxLength={20000}
      style={styles.input}
    />
  );
}

const styles = StyleSheet.create({
  input: { ...Font.sans, fontSize: 17, lineHeight: 24, color: Palette.fg, minHeight: 28, maxHeight: 160, paddingVertical: 4, paddingHorizontal: 0, textAlignVertical: "top" },
});
