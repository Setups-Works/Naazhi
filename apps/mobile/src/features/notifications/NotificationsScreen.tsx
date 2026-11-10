import { ago } from "@untitled/logic";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, StyleSheet, Switch, View } from "react-native";

import { useInbox, useInboxActions, type AppNotification } from "./queries";
import { readPrefs, writePrefs, type NotificationPrefs } from "./prefs";
import { registerPush, unregisterPush } from "./push";
import { replanReminders } from "./reminders";
import { askPermission } from "./setup";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { Palette, Space, Tints } from "@/constants/theme";
import { errorMessage } from "@/lib/api";
import { useAppState } from "@/providers/AppState";

const KIND: Record<AppNotification["kind"], { icon: IconName; tone: "blue" | "violet" | "sand"; label: string }> = {
  admin: { icon: "bullhorn", tone: "blue", label: "Message from the team" },
  invite: { icon: "user-group", tone: "violet", label: "Shared journal" },
  reader: { icon: "newspaper", tone: "sand", label: "Reader" },
};

const SWITCHES: { key: "tasks" | "journal" | "events"; title: string; hint: string }[] = [
  { key: "tasks", title: "To-dos", hint: "A morning summary of what is due" },
  { key: "journal", title: "Journal", hint: "An evening nudge to write, and your streak" },
  { key: "events", title: "Events", hint: "A reminder shortly before an event starts" },
];

/** The notification inbox, and what this phone should remind you about. */
export function NotificationsScreen() {
  const { user } = useAppState();
  const inbox = useInbox();
  const { read, remove } = useInboxActions();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [pushNote, setPushNote] = useState("");

  useEffect(() => {
    if (user) void readPrefs(user.id).then(setPrefs);
  }, [user]);

  // Opening the inbox marks what is there as read.
  const unread = inbox.data?.unread ?? 0;
  useEffect(() => {
    if (unread > 0) read.mutate(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per arrival of new unread items
  }, [unread]);

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
    if (!on) {
      await save({ ...prefs, enabled: false });
      await unregisterPush();
      setPushNote("");
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
    setPushNote(pushed ? "" : "Reminders are on. Messages from the team will show here in the inbox (push isn’t available in this build).");
  }

  return (
    <Screen onRefresh={() => void inbox.refetch()} refreshing={inbox.isRefetching}>
      <AppText variant="title" accessibilityRole="header">
        Notifications
      </AppText>

      <Card tone="green" liquidTint style={styles.settings}>
        <Row title="Notifications on this phone" hint="Reminders and messages from the team" value={prefs?.enabled ?? false} onChange={(v) => void toggleMaster(v)} disabled={!prefs} />
        {prefs?.enabled
          ? SWITCHES.map((s) => <Row key={s.key} title={s.title} hint={s.hint} value={prefs[s.key]} onChange={(v) => void save({ ...prefs, [s.key]: v })} />)
          : null}
        {pushNote ? (
          <AppText variant="small" color={Palette.fgMuted}>
            {pushNote}
          </AppText>
        ) : null}
      </Card>

      <AppText variant="label">Inbox</AppText>
      {inbox.isPending ? (
        <LoadingState />
      ) : inbox.isError ? (
        <ErrorState message={errorMessage(inbox.error)} onRetry={() => void inbox.refetch()} />
      ) : inbox.data.items.length === 0 ? (
        <AppText variant="small" color={Palette.fgSubtle}>
          Nothing yet. Messages from the team, shared-journal invitations and new articles show up here.
        </AppText>
      ) : (
        inbox.data.items.map((n) => {
          const k = KIND[n.kind];
          const t = Tints[k.tone];
          return (
            <Card key={n.id} tone={k.tone} liquidTint onPress={n.url ? () => router.push(n.url as never) : undefined} accessibilityLabel={`${k.label}: ${n.title}`}>
              <View style={styles.head}>
                <Icon name={k.icon} size={14} color={t.fg} />
                <AppText variant="label" color={t.fg} style={styles.kind}>
                  {k.label}
                </AppText>
                <AppText variant="small" color={Palette.fgSubtle}>
                  {ago(n.created_at)}
                </AppText>
              </View>
              <AppText variant="bodyStrong">{n.title}</AppText>
              {n.body ? <AppText variant="body">{n.body}</AppText> : null}
              <Button title="Dismiss" kind="ghost" onPress={() => remove.mutate(n.id)} style={styles.dismiss} />
            </Card>
          );
        })
      )}
    </Screen>
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
      <Switch
        accessibilityLabel={title}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: Palette.greenFg, false: Palette.lineStrong }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  settings: { gap: Space.md },
  row: { flexDirection: "row", alignItems: "center", gap: Space.md },
  rowText: { flex: 1, gap: 2 },
  head: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  kind: { flex: 1 },
  dismiss: { alignSelf: "flex-start", minHeight: 36, marginLeft: -Space.sm },
});
