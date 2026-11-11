import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ReaderScreen } from "@/features/rss/ReaderScreen";
import { EmptyState } from "@/components/ui/States";
import { Palette, themedStyles } from "@/constants/theme";

/**
 * The Workspace tab. The Menu opens it on one page with ?view=workspace (the overview, coming soon) or ?view=reader (the RSS Reader);
 * there is no switch here, because both have their own tile in the Menu.
 */
export function WorkspaceScreen() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.page}>
        {view === "reader" ? (
          <ReaderScreen />
        ) : (
          <EmptyState icon="briefcase" title="Workspace: coming soon" hint="Shared spaces where your team keeps notes, tasks and chat together." />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  root: { flex: 1, backgroundColor: Palette.page },
  page: { flex: 1 },
}));
