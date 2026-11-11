import { NOTIFICATION_KINDS, ago, notificationTarget } from "@untitled/logic";
import { router } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { useInbox, useInboxActions, type AppNotification } from "./queries";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { Palette, Space, Tints } from "@/constants/theme";
import { errorMessage } from "@/lib/api";

/** The labels are shared with the web (packages/logic); the icon and tint are this app's. */
const KIND: Record<AppNotification["kind"], { icon: IconName; tone: "blue" | "violet" | "sand"; label: string }> = {
  admin: { icon: "bullhorn", tone: "blue", label: NOTIFICATION_KINDS.admin.label },
  invite: { icon: "user-group", tone: "violet", label: NOTIFICATION_KINDS.invite.label },
  reader: { icon: "newspaper", tone: "sand", label: NOTIFICATION_KINDS.reader.label },
};

/** The notification inbox. What this phone notifies you about is in Settings → Notifications. */
export function NotificationsScreen() {
  const inbox = useInbox();
  const { read, remove } = useInboxActions();

  // Opening the inbox marks what is there as read.
  const unread = inbox.data?.unread ?? 0;
  useEffect(() => {
    if (unread > 0) read.mutate(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per arrival of new unread items
  }, [unread]);

  return (
    <Screen onRefresh={() => void inbox.refetch()} refreshing={inbox.isRefetching}>
      <AppText variant="title" accessibilityRole="header">
        Notifications
      </AppText>
      <Button title="Notification settings" icon="sliders" kind="secondary" onPress={() => router.push({ pathname: "/profile", params: { section: "notifications" } })} />

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
            <Card key={n.id} tone={k.tone} liquidTint onPress={notificationTarget(n) ? () => router.push(notificationTarget(n) as never) : undefined} accessibilityLabel={`${k.label}: ${n.title}`}>
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

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  kind: { flex: 1 },
  dismiss: { alignSelf: "flex-start", minHeight: 36 },
});
