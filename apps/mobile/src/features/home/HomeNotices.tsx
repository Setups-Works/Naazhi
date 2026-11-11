import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Neutral, Palette, Radius, Space, Tints, themedStyles } from "@/constants/theme";
import { dbQuery } from "@/features/chat/db";
import { isoDate } from "@/lib/dates";
import { useAppState } from "@/providers/AppState";

// Short, true hints about things the app does. One shows per day, picked by the date (the web has the same idea, worded for the phone).
const TIPS = [
  "Type “Call the bank tomorrow at 4pm p2” in the quick add on Plan. The date and priority are picked out for you.",
  "Pin a note to keep it at the top of your Notes.",
  "Switch the Journal to Calendar to see which days you wrote on.",
  "Tap Menu on the navbar for every section, and Search to jump to any task, note or entry.",
  "Ask Naazhi AI to draft a note or a task. You confirm it before anything is saved.",
  "Group tasks by priority or date from the layout button on Plan.",
  "Add a skill in Settings, then type / in chat to run it.",
  "Reduce motion in Appearance turns off animations across the app.",
];
const TIP_KEY = "naazhi.tip.dismissed";
const ANN_KEY = "naazhi.announcements.dismissed";

type Announcement = { id: string; message: string; tone: string };
const TONE_ICON: Record<string, IconName> = { info: "bullhorn", success: "circle-check", warning: "triangle-exclamation" };

/** One tip a day and the admin's announcements, at the top of Home. Each is hidden by its switch in Settings → General. */
export function HomeNotices() {
  const { preferences } = useAppState();
  const [tipGone, setTipGone] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState<string[] | null>(null);
  const day = isoDate();

  useEffect(() => {
    void AsyncStorage.getItem(TIP_KEY).then((v) => setTipGone(v === day)).catch(() => setTipGone(false));
    void AsyncStorage.getItem(ANN_KEY).then((v) => setDismissed(v ? (JSON.parse(v) as string[]) : [])).catch(() => setDismissed([]));
  }, [day]);

  const ann = useQuery({
    queryKey: ["announcements"],
    enabled: preferences.homeAnnouncements,
    staleTime: 5 * 60_000,
    queryFn: async () =>
      (await dbQuery<Announcement[]>({
        table: "announcements",
        op: "select",
        columns: "id,message,tone",
        filters: [{ column: "active", op: "eq", value: true }],
        order: [{ column: "created_at", ascending: false }],
        limit: 3,
      })) ?? [],
  });

  const shown = preferences.homeAnnouncements && dismissed ? (ann.data ?? []).filter((a) => !dismissed.includes(a.id)) : [];
  const days = Math.floor(new Date(`${day}T12:00:00`).getTime() / 86_400_000);
  const tip = preferences.homeTips && tipGone === false ? TIPS[days % TIPS.length] : null;
  if (!tip && shown.length === 0) return null;

  const dismiss = (id: string) => {
    const next = [...(dismissed ?? []), id].slice(-50);
    setDismissed(next);
    void AsyncStorage.setItem(ANN_KEY, JSON.stringify(next)).catch(() => undefined);
  };

  return (
    <View style={styles.wrap}>
      {shown.map((a) => {
        const t = a.tone === "success" ? Tints.green : a.tone === "warning" ? Tints.amber : Tints.blue;
        return (
          <View key={a.id} accessibilityRole="alert" style={[styles.box, { backgroundColor: t.bg, borderColor: t.line }]}>
            <Icon name={TONE_ICON[a.tone] ?? "bullhorn"} size={14} color={t.fg} />
            <AppText variant="small" color={t.fg} style={styles.text}>
              {a.message}
            </AppText>
            <Pressable accessibilityRole="button" accessibilityLabel="Dismiss announcement" hitSlop={10} onPress={() => dismiss(a.id)}>
              <Icon name="xmark" size={13} color={t.fg} />
            </Pressable>
          </View>
        );
      })}
      {tip ? (
        <View accessibilityRole="summary" style={[styles.box, { backgroundColor: Neutral.bg, borderColor: Neutral.line }]}>
          <Icon name="lightbulb" size={13} color={Palette.fgSubtle} />
          <AppText variant="small" color={Palette.fgMuted} style={styles.text}>
            <AppText variant="small" color={Palette.fg} style={styles.bold}>
              Tip:{" "}
            </AppText>
            {tip}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hide today’s tip"
            hitSlop={10}
            onPress={() => {
              setTipGone(true);
              void AsyncStorage.setItem(TIP_KEY, day).catch(() => undefined);
            }}
          >
            <Icon name="xmark" size={13} color={Palette.fgSubtle} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: { gap: Space.sm },
  box: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: Radius.r2, borderWidth: 1 },
  text: { flex: 1 },
  bold: { fontWeight: "600" },
}));
