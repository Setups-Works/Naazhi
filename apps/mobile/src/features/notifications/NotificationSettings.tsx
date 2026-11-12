import { Switch } from "@/components/ui/Switch";
import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, View } from "react-native";

import { readPrefs, writePrefs, writeDeviceChoice, type NotificationPrefs } from "./prefs";
import { registerPush, unregisterPush } from "./push";
import { replanReminders } from "./reminders";
import { askPermission } from "./setup";
import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { Palette, Space, themedStyles } from "@/constants/theme";
import { useAppState } from "@/providers/AppState";

const SWITCHES: { key: "tasks" | "journal" | "events"; title: string; hint: string }[] = [
  { key: "tasks", title: "To-dos", hint: "A morning summary of what is due" },
  { key: "journal", title: "Journal", hint: "An evening nudge to write, and your streak" },
  { key: "events", title: "Events", hint: "A reminder shortly before an event starts" },
];

/** What this phone should notify you about. Lives in Settings; the Notifications screen is only the inbox. */
export function NotificationSettings() {
  const { user } = useAppState();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (user) void readPrefs(user.id).then(setPrefs);
  }, [user]);

  const save = useCallback(
    async (next: NotificationPrefs) => {
      if (!user) return;
      setPrefs(next);
      await writePrefs(user.id, next);
      await replanReminders(next).catch(() => undefined);
    },
    [user],
  );

  async function toggleMaster(on: boolean) {
    if (!prefs) return;
    await writeDeviceChoice(on);
    if (!on) {
      await save({ ...prefs, enabled: false });
      await unregisterPush();
      setNote("");
      return;
    }
    if (!(await askPermission())) {
      Alert.alert("Notifications are off", "Allow notifications for this app in your phone’s settings to get reminders and messages.", [
        { text: "Not now", style: "cancel" },
        { text: "Open settings", onPress: () => void Linking.openSettings() },
      ]);
      return;
    }
    await save({ ...prefs, enabled: true });
    const pushed = await registerPush();
    setNote(pushed ? "" : "Reminders are on. Messages from the team will show in the Notifications inbox (push isn’t available in this build).");
  }

  return (
    <Card style={styles.card}>
      <Row title="Notifications on this phone" hint="Reminders and messages from the team" value={prefs?.enabled ?? false} onChange={(v) => void toggleMaster(v)} disabled={!prefs} />
      {prefs?.enabled
        ? SWITCHES.map((s) => <Row key={s.key} title={s.title} hint={s.hint} value={prefs[s.key]} onChange={(v) => void save({ ...prefs, [s.key]: v })} />)
        : null}
      {note ? (
        <AppText variant="small" color={Palette.fgMuted}>
          {note}
        </AppText>
      ) : null}
    </Card>
  );
}

function Row({ title, hint, value, onChange, disabled }: { title: string; hint: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="small" color={Palette.fgMuted}>
          {hint}
        </AppText>
      </View>
      <Switch accessibilityLabel={title} value={value} disabled={disabled} onValueChange={onChange} />
    </View>
  );
}

const styles = themedStyles(() => ({
  card: { gap: Space.md },
  row: { flexDirection: "row", alignItems: "center", gap: Space.md },
  rowText: { flex: 1, gap: 2 },
}));
