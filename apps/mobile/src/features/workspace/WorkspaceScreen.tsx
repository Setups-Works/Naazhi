import { useCallback, useEffect, useRef, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ReaderScreen } from "@/features/rss/ReaderScreen";
import { EmptyState } from "@/components/ui/States";
import { Segmented } from "@/components/ui/Segmented";
import { Palette, Space } from "@/constants/theme";

type View_ = "workspace" | "reader";
const VIEWS: { key: View_; label: string }[] = [
  { key: "workspace", label: "Workspace" },
  { key: "reader", label: "Reader" },
];

/**
 * The Workspace tab: a pill switcher between the Workspace overview (coming soon) and the RSS Reader, and the two pages can be dragged
 * sideways, the same as the Plan tab. The web has the same two pages.
 */
export function WorkspaceScreen() {
  const { width } = useWindowDimensions();
  const pager = useRef<ScrollView>(null);
  const [view, setView] = useState<View_>("workspace");
  const current = useRef(view);

  // Rotating the device changes the width of a page: keep the page that was showing in view.
  useEffect(() => {
    pager.current?.scrollTo({ x: VIEWS.findIndex((v) => v.key === current.current) * width, animated: false });
  }, [width]);

  const go = useCallback(
    (next: View_) => {
      current.current = next;
      setView(next);
      pager.current?.scrollTo({ x: VIEWS.findIndex((v) => v.key === next) * width, animated: true });
    },
    [width],
  );

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    const next = VIEWS[Math.min(Math.max(index, 0), VIEWS.length - 1)]!.key;
    current.current = next;
    setView(next);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.pills}>
        <Segmented options={VIEWS} value={view} onChange={go} />
      </View>
      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={settle}
        style={styles.pager}
        accessibilityLabel="Workspace and Reader"
      >
        <View style={{ width }}>
          <EmptyState icon="briefcase" title="Workspace: coming soon" hint="Shared spaces where your team keeps notes, tasks and chat together." />
        </View>
        <View style={{ width }}>
          <ReaderScreen />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.page },
  pills: { paddingHorizontal: Space.lg, paddingTop: Space.sm, paddingBottom: Space.md },
  pager: { flex: 1 },
});
