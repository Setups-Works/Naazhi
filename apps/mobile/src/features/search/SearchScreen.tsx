import { router, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NAV } from "@/components/nav/navItems";
import { AppText } from "@/components/ui/AppText";
import { Icon, type IconName } from "@/components/ui/Icon";
import { SectionLabel } from "@/components/ui/PageHeader";
import { Font, Palette, Radius, Space, themedStyles } from "@/constants/theme";
import { useJournal } from "@/features/journal/queries";
import { useNotes } from "@/features/notes/queries";
import { useTasks } from "@/features/tasks/queries";

type Hit = { id: string; title: string; sub?: string; icon: IconName; go: () => void };

const norm = (s: string) => s.toLowerCase();
const clip = (s: string, q: string) => {
  const i = norm(s).indexOf(norm(q));
  if (i < 0) return s.slice(0, 80);
  return `${i > 20 ? "…" : ""}${s.slice(Math.max(0, i - 20), i + 70).replace(/\s+/g, " ")}`;
};

/** Universal search (the web's ⌘K): jump to a page, a task, a note or a journal entry. Works on what is already loaded, on your device. */
export function SearchScreen() {
  const [q, setQ] = useState("");
  const tasks = useTasks();
  const notes = useNotes();
  const journal = useJournal();
  const go = (href: Href) => () => router.replace(href);

  const groups = useMemo(() => {
    const t = q.trim();
    const match = (...parts: (string | null | undefined)[]) => !t || parts.some((p) => p && norm(p).includes(norm(t)));
    const pages: Hit[] = NAV.filter((n) => match(n.title)).map((n) => ({ id: `p-${n.key}`, title: n.title, sub: "Page", icon: n.icon, go: go(n.href) }));
    if (!t) return [["Pages & actions", pages]] as [string, Hit[]][];
    const out: [string, Hit[]][] = [["Pages & actions", pages]];
    out.push([
      "Tasks",
      (tasks.data ?? [])
        .filter((x) => match(x.title, x.description))
        .slice(0, 8)
        .map((x) => ({ id: `t-${x.id}`, title: x.title, sub: x.due_date ?? undefined, icon: x.done ? "square-check" : "list-check", go: go({ pathname: "/task/[id]", params: { id: x.id } }) })),
    ]);
    out.push([
      "Notes",
      (notes.data ?? [])
        .filter((x) => match(x.title, x.body))
        .slice(0, 8)
        .map((x) => ({ id: `n-${x.id}`, title: x.title || "Untitled", sub: clip(x.body, t), icon: "note-sticky", go: go({ pathname: "/note/[id]", params: { id: x.id } }) })),
    ]);
    out.push([
      "Journal",
      (journal.data ?? [])
        .filter((x) => match(x.body))
        .slice(0, 8)
        .map((x) => ({ id: `j-${x.id}`, title: x.entry_date, sub: clip(x.body, t), icon: "book-open", go: go({ pathname: "/journal/[id]", params: { id: x.id } }) })),
    ]);
    return out.filter(([, hits]) => hits.length);
  }, [q, tasks.data, notes.data, journal.data]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bar}>
        <Icon name="magnifying-glass" size={15} color={Palette.fgSubtle} />
        <TextInput
          autoFocus
          value={q}
          onChangeText={setQ}
          placeholder="Search tasks, notes, journal, pages"
          placeholderTextColor={Palette.fgFaint}
          selectionColor={Palette.greenFg}
          accessibilityLabel="Search"
          returnKeyType="search"
          style={styles.input}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Close search" hitSlop={12} onPress={() => router.back()}>
          <AppText variant="bodyStrong" color={Palette.fgMuted}>
            Close
          </AppText>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {groups.length === 0 ? (
          <AppText variant="small" color={Palette.fgSubtle} align="center" style={styles.none}>
            Nothing matches “{q.trim()}”.
          </AppText>
        ) : (
          groups.map(([label, hits]) => (
            <View key={label} style={styles.group}>
              <SectionLabel>{label}</SectionLabel>
              <View style={styles.rows}>
                {hits.map((h, i) => (
                  <Pressable key={h.id} accessibilityRole="button" accessibilityLabel={h.title} onPress={h.go} style={({ pressed }) => [styles.row, i > 0 ? styles.line : null, pressed ? styles.pressed : null]}>
                    <Icon name={h.icon} size={14} color={Palette.fgMuted} />
                    <View style={styles.text}>
                      <AppText variant="bodyStrong" numberOfLines={1}>
                        {h.title}
                      </AppText>
                      {h.sub ? (
                        <AppText variant="small" color={Palette.fgSubtle} numberOfLines={1}>
                          {h.sub}
                        </AppText>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  safe: { flex: 1, backgroundColor: Palette.page },
  bar: { flexDirection: "row", alignItems: "center", gap: 10, margin: Space.lg, paddingHorizontal: 14, minHeight: 48, borderRadius: Radius.r2, borderWidth: 1, borderColor: Palette.lineStrong, backgroundColor: Palette.surfaceMuted },
  input: { flex: 1, ...Font.sans, fontSize: 16, color: Palette.fg, paddingVertical: 10 },
  list: { paddingHorizontal: Space.lg, paddingBottom: Space.xxl, gap: Space.lg },
  group: { gap: 10 },
  rows: { borderWidth: 1, borderColor: Palette.line, borderRadius: Radius.r3, overflow: "hidden", backgroundColor: Palette.surface },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 11, minHeight: 52 },
  line: { borderTopWidth: 1, borderTopColor: Palette.line },
  pressed: { backgroundColor: Palette.surfaceMuted },
  text: { flex: 1, gap: 2 },
  none: { paddingTop: Space.xl },
}));
