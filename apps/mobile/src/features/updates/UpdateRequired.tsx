import { Linking, Modal, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Palette, Space, themedStyles } from "@/constants/theme";

/** Where the Play Store listing opens when Play's in-app update screen can't be shown. */
const PLAY_LISTING = "market://details?id=com.setupsworks.naazhi";

/**
 * The mandatory update screen: full-screen, no close button, and the Android back button does nothing. It stays until Google Play has
 * installed the new version (Play then restarts the app).
 */
export function UpdateRequired({ visible, updating, onUpdate }: { visible: boolean; updating: boolean; onUpdate: () => void }) {
  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
      <View style={styles.screen}>
        <AppText variant="title">Update required</AppText>
        <AppText variant="body" color={Palette.fgMuted} style={styles.body}>
          A new version of Naazhi is ready. Please update to keep using the app.
        </AppText>
        <Button title={updating ? "Opening Google Play…" : "Update now"} icon="download" loading={updating} onPress={onUpdate} />
        <Button
          title="Open in Google Play"
          kind="secondary"
          onPress={() => void Linking.openURL(PLAY_LISTING).catch(() => undefined)}
        />
      </View>
    </Modal>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, justifyContent: "center", gap: Space.md, padding: Space.xl, backgroundColor: Palette.page },
  body: { marginBottom: Space.sm },
}));
