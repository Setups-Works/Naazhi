import { router } from "expo-router";
import { View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Palette, Radius, themedStyles } from "@/constants/theme";
import { useGoogleStatus, useImportGoogleCalendar } from "@/features/integrations/connect";
import { errorMessage } from "@/lib/api";

/**
 * Google Calendar on the Calendar screen. Not connected: a nudge to connect it in Settings. Connected: a button that imports every event of
 * the main Google calendar (two years back to two years ahead) into this calendar; importing again updates them, it never adds copies.
 */
export function GoogleCalendarBanner() {
  const status = useGoogleStatus();
  const run = useImportGoogleCalendar();
  const s = status.data;
  if (!s?.configured) return null;
  const connected = s.apps.some((a) => a.app === "googlecalendar" && a.state === "connected");
  const done = run.data;
  const title = !connected ? "Bring in Google Calendar." : done ? `Imported ${done.count} ${done.count === 1 ? "event" : "events"} from Google Calendar.` : "Import your Google Calendar.";
  const text = !connected
    ? "Connect it in Settings to see your events here."
    : run.isError
      ? errorMessage(run.error, "Couldn’t import your events. Try again.")
      : done?.truncated
        ? "That was the first 2,500 events (two years either side of today)."
        : done
          ? "They are in your calendar now. Import again any time to bring in new ones."
          : "Bring every event from two years back to two years ahead into this calendar.";
  return (
    <View style={styles.box} accessibilityRole="summary">
      <Icon name="calendar-days" size={16} color={Palette.fgMuted} />
      <View style={styles.text}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="small" color={run.isError ? Palette.clayFg : Palette.fgMuted}>
          {text}
        </AppText>
      </View>
      {connected ? (
        <Button title={run.isPending ? "Importing…" : done ? "Again" : "Import"} kind="secondary" loading={run.isPending} onPress={() => run.mutate()} />
      ) : (
        <Button title="Connect" kind="secondary" onPress={() => router.push({ pathname: "/profile", params: { section: "google" } })} />
      )}
    </View>
  );
}

const styles = themedStyles(() => ({
  box: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: Radius.r3, backgroundColor: Palette.surfaceMuted },
  text: { flex: 1, gap: 2 },
}));
