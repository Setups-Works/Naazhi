import { RefreshControl, ScrollView, View, KeyboardAvoidingView, Platform, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ContentWidth, Palette, Space, themedStyles } from "@/constants/theme";
import { useLayout } from "@/lib/layout";

export type ScreenEdges = ("top" | "bottom" | "left" | "right")[];

type Props = {
  children: React.ReactNode;
  /** Scrolls the content; pass onRefresh to add pull-to-refresh. */
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  edges?: ScreenEdges;
  contentStyle?: StyleProp<ViewStyle>;
  /** Lets the content grow to the full width of a tablet (for pages laid out in columns). Other screens stop at a comfortable reading width. */
  wide?: boolean;
  /** One-screen pages (sign-in): content is centred, and the page only scrolls if it truly does not fit (a small phone with the keyboard up). */
  fit?: boolean;
};

/** Cream canvas with safe areas, a readable max width on tablets, and keyboard avoidance. */
export function Screen({ children, scroll = true, onRefresh, refreshing = false, edges = ["top", "left", "right"], contentStyle, wide = false, fit = false }: Props) {
  const layout = useLayout();
  // A phone keeps its 640 column. On a tablet a page may use more room, a list stops at a width that is still pleasant to read.
  const maxWidth = wide ? layout.contentWidth : Math.min(layout.contentWidth, ContentWidth.medium);
  const paddingHorizontal = layout.padding;
  const inner = <View style={[styles.column, fit ? styles.fit : null, { maxWidth, paddingHorizontal }, contentStyle]}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            alwaysBounceVertical={!fit}
            bounces={!fit}
            refreshControl={
              onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.greenFg} /> : undefined
            }
          >
            {inner}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.scroll]}>{inner}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  safe: { flex: 1, backgroundColor: Palette.page },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: "center" },
  fit: { flexGrow: 1, justifyContent: "center", paddingBottom: Space.lg },
  column: {
    width: "100%",
    paddingTop: Space.lg,
    paddingBottom: Space.xxl + 56,
    gap: Space.lg,
  },
}));
