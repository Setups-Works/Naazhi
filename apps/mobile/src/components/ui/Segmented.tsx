import { Pressable, ScrollView, View } from "react-native";

import { AppText } from "./AppText";
import { usePagerLock } from "./PagerLock";
import { Font, Palette, themedStyles } from "@/constants/theme";

/** Underlined tabs (the web's `tdo-tabs`): ink label and a 2 px ink underline on the current one, a hairline under the row. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const lock = usePagerLock();
  return (
    <View style={styles.rule}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        accessibilityRole="tablist"
        onTouchStart={() => lock(true)}
        onTouchEnd={() => lock(false)}
        onTouchCancel={() => lock(false)}
      >
        {options.map((o) => {
          const on = o.key === value;
          return (
            <Pressable
              key={o.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(o.key)}
              style={[styles.tab, on ? styles.tabOn : null]}
            >
              <AppText variant="body" color={on ? Palette.fg : Palette.fgSubtle} style={on ? styles.textOn : null}>
                {o.label}
                {o.count ? `  ${o.count}` : ""}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = themedStyles(() => ({
  rule: { borderBottomWidth: 1, borderBottomColor: Palette.line },
  row: { gap: 22 },
  tab: { minHeight: 42, justifyContent: "center", borderBottomWidth: 2, borderBottomColor: "transparent", marginBottom: -1 },
  tabOn: { borderBottomColor: Palette.fillDark },
  textOn: { ...Font.sansMedium },
}));
