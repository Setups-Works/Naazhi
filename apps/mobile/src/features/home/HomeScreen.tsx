import type { Note } from "@untitled/types";
import { ago, fmtDuration, isOverdue, rssAge, toDate } from "@untitled/logic";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GlassPill } from "@/components/ui/GlassPill";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { Screen } from "@/components/ui/Screen";
import { Font, Palette, Radius, Space, Tints } from "@/constants/theme";
import { errorMessage } from "@/lib/api";
import { addDays, greeting, isoDate, longDate, timeOf } from "@/lib/dates";
import { useCalendarEvents } from "@/features/calendar/queries";
import { useInbox } from "@/features/notifications/queries";
import { useChats } from "@/features/chat/queries";
import { useHealthDays } from "@/features/health/queries";
import { useJournal, useJournalActions } from "@/features/journal/queries";
import { useArticles, useFeeds } from "@/features/rss/queries";
import { useNotes } from "@/features/notes/queries";
import { TaskRow } from "@/features/tasks/TaskRow";
import { useTaskActions, useTasks } from "@/features/tasks/queries";
import { useToggleTask } from "@/features/tasks/useToggleTask";
import { useAppState, useAuth } from "@/providers/AppState";
import { ReorderableList, type ReorderNode } from "@/components/ui/ReorderableList";
import { HomePanel, PanelEmpty } from "./HomePanel";
import { PersonalityInsightsCard } from "./PersonalityInsightsCard";
import { useBilling } from "@/features/billing/queries";
import { HOME_COLUMNS, useHomeOrder } from "./useHomeOrder";
import { useLayout } from "@/lib/layout";

const QUICK: { title: string; icon: IconName; go: () => void }[] = [
  { title: "Plan my day", icon: "list-check", go: () => router.navigate("/todo") },
  { title: "Journal", icon: "book-open", go: () => router.navigate("/journal") },
  { title: "New note", icon: "pen-to-square", go: () => router.push({ pathname: "/note/[id]", params: { id: "new" } }) },
  { title: "New chat", icon: "comments", go: () => router.navigate("/chat") },
];

/** What the drag grip announces for each section. */
const LABELS: Record<string, string> = {
  plans: "Plans",
  today: "Today",
  journal: "Today’s journal",
  notes: "Notes",
  chats: "Chats",
  schedule: "Schedule",
  reader: "Reader",
  health: "Health",
  streak: "Journal streak",
  insights: "Personality insights",
};

/** The web Home with the same cards, a quick-action row and a grip on every card to drag it. */
export function HomeScreen() {
  const { user } = useAppState();
  const auth = useAuth();
  const tasksQ = useTasks();
  const journalQ = useJournal();
  const notesQ = useNotes();
  const toggle = useToggleTask();
  const [order, saveOrder] = useHomeOrder();
  const layout = useLayout();
  const billingQ = useBilling();
  const unreadCount = useInbox().data?.unread ?? 0;
  const chatsQ = useChats();
  const calendarQ = useCalendarEvents();
  const feedsQ = useFeeds();
  const articlesQ = useArticles({ filter: "all", q: "" });
  const healthQ = useHealthDays();
  const { add: addTask } = useTaskActions(isoDate());
  const { create: createEntry } = useJournalActions();
  const [taskTitle, setTaskTitle] = useState("");
  const [entryText, setEntryText] = useState("");
  const today = useMemo(() => isoDate(), []);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarCookie, setAvatarCookie] = useState<string | null>(null);
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void auth
      .getCookie()
      .then((cookie) => {
        if (active) setAvatarCookie(cookie);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [auth]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([tasksQ.refetch(), journalQ.refetch(), notesQ.refetch(), chatsQ.refetch(), feedsQ.refetch(), articlesQ.refetch(), healthQ.refetch(), calendarQ.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [tasksQ, journalQ, notesQ, chatsQ, feedsQ, articlesQ, healthQ, calendarQ]);

  const first = user?.name.trim().split(/\s+/)[0] ?? "";
  // Nothing until the plan is known, so a subscriber never sees "Free" flash first.
  const plan = billingQ.data ? (billingQ.data.plan?.name ?? "Free") : null;
  const header = (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <View style={styles.dateRow}>
          <AppText variant="small" color={Palette.fgSubtle}>
            {longDate()}
          </AppText>
          {plan ? (
            <View style={styles.planBadge}>
              <AppText variant="label" color={Tints.green.fg} style={styles.planText}>
                {plan}
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="title" accessibilityRole="header" style={styles.greeting}>
          {greeting()},{first ? " " : ""}
          {first ? <AppText variant="title" style={styles.name}>{first}</AppText> : null}
        </AppText>
      </View>
      <GlassPill
        accessibilityRole="button"
        accessibilityLabel={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        hitSlop={8}
        onPress={() => router.push("/notifications")}
        style={styles.bell}
      >
        <Icon name="bell" size={16} color={Palette.fgMuted} />
        {unreadCount ? <View style={styles.bellDot} /> : null}
      </GlassPill>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        hitSlop={8}
        onPress={() => router.push("/profile")}
        style={({ pressed }) => [styles.avatar, pressed ? styles.pressed : null]}
      >
        {user?.image && failedAvatar !== user.image ? (
          <Image
            source={{ uri: user.image, ...(avatarCookie ? { headers: { Cookie: avatarCookie } } : {}) }}
            style={styles.avatarImage}
            contentFit="cover"
            transition={150}
            onError={() => setFailedAvatar(user.image ?? null)}
            accessibilityLabel={`${user.name || "User"} profile photo`}
          />
        ) : (
          <AppText variant="bodyStrong" color={Palette.onDark}>
            {(user?.name || "?").trim().charAt(0).toUpperCase()}
          </AppText>
        )}
      </Pressable>
    </View>
  );
  const quick = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel="Quick actions"
      contentContainerStyle={[styles.quick, { paddingHorizontal: layout.padding }]}
      // The row runs to the screen edges, so it cancels the page's own side margin.
      style={[styles.quickScroll, { marginHorizontal: -layout.padding }]}
    >
      {QUICK.map((q) => (
        <GlassPill
          key={q.title}
          accessibilityRole="button"
          accessibilityLabel={q.title}
          onPress={q.go}
          style={({ pressed }) => [styles.pill, pressed ? styles.pressed : null]}
        >
          <Icon name={q.icon} size={12} color={Palette.fgMuted} />
          <AppText variant="small" color={Palette.fgMuted}>
            {q.title}
          </AppText>
        </GlassPill>
      ))}
    </ScrollView>
  );

  if (tasksQ.isPending || journalQ.isPending || notesQ.isPending)
    return (
      <Screen>
        {header}
        {quick}
        <LoadingState />
      </Screen>
    );

  if (tasksQ.isError || journalQ.isError || notesQ.isError)
    return (
      <Screen onRefresh={refresh} refreshing={refreshing}>
        {header}
        {quick}
        <ErrorState message={errorMessage(tasksQ.error ?? journalQ.error ?? notesQ.error)} onRetry={() => void refresh()} />
      </Screen>
    );

  const tasks = tasksQ.data;
  const dueToday = tasks.filter((task) => task.due_date === today && !task.cancelled && !task.archived);
  const overdue = tasks.filter((task) => isOverdue(task, today));
  const entries = journalQ.data;
  const loggedDays = new Set(entries.map((entry) => entry.entry_date));
  const todayLogged = loggedDays.has(today);
  const weekOffset = (new Date(`${today}T00:00:00`).getDay() + 6) % 7;
  const weekStart = addDays(today, -weekOffset);
  const week = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  let streak = 0;
  let streakDay = todayLogged ? today : addDays(today, -1);
  while (loggedDays.has(streakDay)) {
    streak++;
    streakDay = addDays(streakDay, -1);
  }
  const recentNotes = [...notesQ.data]
    .sort((left, right) => toDate(right.updated_at).getTime() - toDate(left.updated_at).getTime())
    .slice(0, 3);

  const todayList = [...overdue, ...dueToday.filter((task) => !overdue.includes(task))];
  const doneToday = dueToday.filter((task) => task.done).length;
  const pct = dueToday.length ? Math.round((doneToday / dueToday.length) * 100) : 0;
  const todaysEntries = entries.filter((entry) => entry.entry_date === today).slice(0, 3);
  const events = (calendarQ.data ?? []).filter((ev) => (ev.all_day ? ev.start_at.slice(0, 10) : isoDate(toDate(ev.start_at))) === today).slice(0, 5);
  const articles = (articlesQ.data?.pages[0]?.items ?? []).slice(0, 4);
  const unread = (feedsQ.data ?? []).reduce((sum, feed) => sum + feed.unread, 0);
  const health = (healthQ.data ?? []).find((d) => d.day === today) ?? healthQ.data?.[healthQ.data.length - 1];
  const chats = (chatsQ.data ?? []).slice(0, 4);

  function submitTask() {
    const title = taskTitle.trim();
    if (!title) return;
    setTaskTitle("");
    addTask.mutate(
      { title, description: "", due_date: today, priority: 4, list_id: null, recurrence: null },
      { onError: () => setTaskTitle(title) },
    );
  }
  function submitEntry() {
    const body = entryText.trim();
    if (!body) return;
    setEntryText("");
    createEntry.mutate({ entry_date: today, body }, { onError: () => setEntryText(body) });
  }

  const sections: Record<string, ReorderNode | null> = {
    streak: (handle: ReactNode) => (
      <Card
        tone="green"
        liquidTint
        accessibilityLabel={`Journal streak: ${streak} days. ${todayLogged ? "Logged today" : "Not logged today"}`}
        style={styles.streakCard}
      >
        <View style={styles.cardHeader}>
          <AppText variant="bodyStrong">Journal streak</AppText>
          <View style={styles.streakRight}>
            <AppText variant="label" color={todayLogged ? Palette.greenFg : Palette.fgSubtle}>
              {todayLogged ? "Today logged" : "Today not logged"}
            </AppText>
            {handle}
          </View>
        </View>
        <View style={styles.streakSummary}>
          <View style={styles.streakNumber}>
            <AppText variant="display" style={styles.streakValue}>
              {streak}
            </AppText>
            <AppText variant="body" color={Palette.fgMuted}>
              days
            </AppText>
          </View>
          <AppText variant="small" color={Palette.fgMuted} align="right" style={styles.streakHint}>
            {streak ? `${Math.max(0, 7 - streak)} more for a full week.` : "Write an entry to start your streak."}
          </AppText>
        </View>
        <View style={styles.week} accessibilityLabel="Journal entries this week">
          {week.map((date) => {
            const active = loggedDays.has(date);
            const isToday = date === today;
            const label = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: "narrow" });
            return (
              <View
                key={date}
                accessibilityLabel={`${new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: "long" })}${active ? ", journal entry saved" : ", no journal entry"}`}
                style={[styles.weekDay, active ? styles.weekDayActive : null, isToday && !active ? styles.weekDayToday : null]}
              >
                <AppText variant="small" color={active ? Palette.onDark : Palette.fgSubtle} style={styles.weekLabel}>
                  {label}
                </AppText>
              </View>
            );
          })}
        </View>
      </Card>
    ),
    // Only until a plan is chosen; after that the card disappears and the section is skipped.
    plans:
      billingQ.data && !billingQ.data.plan ? (
        <Card tone="gold" liquidTint onPress={() => router.push("/pricing")} accessibilityLabel="Choose a plan">
          <AppText variant="bodyStrong">Choose how you pay for AI</AppText>
          <AppText variant="small" color={Palette.fgMuted}>A subscription, pay as you go, or your own key. See the plans and prices.</AppText>
        </Card>
      ) : null,
    today: (handle: ReactNode) => (
      <Card style={styles.todayCard} accessibilityLabel="Today">
        <View style={styles.todayHead}>
          <AppText variant="heading" accessibilityRole="header" style={styles.todayTitle}>
            Today
          </AppText>
          <AppText variant="small" color={Palette.fgSubtle} style={styles.todayCount}>
            {doneToday} of {dueToday.length} done
          </AppText>
          {handle}
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Today’s progress"
          accessibilityValue={{ min: 0, max: 100, now: pct }}
          style={styles.progress}
        >
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        <View style={styles.addRow}>
          <Icon name="plus" size={12} color={Palette.fgSubtle} />
          <TextInput
            value={taskTitle}
            onChangeText={setTaskTitle}
            onSubmitEditing={submitTask}
            returnKeyType="done"
            placeholder="Add a task for today…"
            placeholderTextColor={Palette.fgSubtle}
            maxLength={300}
            accessibilityLabel="Add a task for today"
            style={styles.addInput}
          />
        </View>
        {todayList.length ? (
          <View>
            {todayList.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                today={today}
                onToggle={toggle}
                onOpen={(item) => router.push({ pathname: "/task/[id]", params: { id: item.id } })}
              />
            ))}
          </View>
        ) : (
          <PanelEmpty>Nothing planned yet. Add the first thing above.</PanelEmpty>
        )}
      </Card>
    ),
    journal: (handle: ReactNode) => (
      <HomePanel icon="book-open" title="Today’s journal" onOpen={() => router.navigate("/journal")} handle={handle}>
        {todaysEntries.map((entry) => (
          <View key={entry.id} style={styles.entryRow}>
            <AppText variant="small" color={Palette.fgSubtle} style={styles.entryTime}>
              {timeOf(entry.created_at)}
            </AppText>
            <AppText variant="small" color={Palette.fgMuted} numberOfLines={2} style={styles.entryBody}>
              {entry.body || "Voice or attachment"}
            </AppText>
          </View>
        ))}
        <View style={styles.entryForm}>
          <TextInput
            value={entryText}
            onChangeText={setEntryText}
            multiline
            maxLength={50000}
            placeholder={todaysEntries.length ? "Add another entry…" : "How is today going?"}
            placeholderTextColor={Palette.fgSubtle}
            accessibilityLabel="New journal entry"
            style={styles.entryInput}
          />
          <Button title="Add" onPress={submitEntry} disabled={!entryText.trim()} loading={createEntry.isPending} />
        </View>
      </HomePanel>
    ),
    notes: (handle: ReactNode) => (
      <HomePanel icon="pen-to-square" title="Notes" hint={`${notesQ.data.length} saved`} onOpen={() => router.navigate("/notes")} handle={handle}>
        {recentNotes.length ? (
          recentNotes.map((note) => (
            <Pressable
              key={note.id}
              accessibilityRole="button"
              accessibilityLabel={`Open note: ${noteTitle(note)}`}
              onPress={() => router.push({ pathname: "/note/[id]", params: { id: note.id } })}
              style={({ pressed }) => [styles.listRow, pressed ? styles.pressed : null]}
            >
              <AppText variant="body" numberOfLines={1} style={styles.listTitle}>
                {noteTitle(note)}
              </AppText>
              <AppText variant="small" color={Palette.fgSubtle}>
                {ago(note.updated_at)}
              </AppText>
            </Pressable>
          ))
        ) : (
          <PanelEmpty>No notes yet. Save an idea from Notes.</PanelEmpty>
        )}
      </HomePanel>
    ),
    chats: (handle: ReactNode) => (
      <HomePanel icon="comments" title="Chats" onOpen={() => router.navigate("/chat")} handle={handle}>
        {chats.length ? (
          chats.map((chat) => (
            <Pressable
              key={chat.id}
              accessibilityRole="button"
              accessibilityLabel={`Open chats: ${chat.title}`}
              onPress={() => router.navigate("/chat")}
              style={({ pressed }) => [styles.listRow, pressed ? styles.pressed : null]}
            >
              <AppText variant="body" numberOfLines={1} style={styles.listTitle}>
                {chat.title}
              </AppText>
              <AppText variant="small" color={Palette.fgSubtle}>
                {ago(chat.updated_at)}
              </AppText>
            </Pressable>
          ))
        ) : (
          <PanelEmpty>No chats yet</PanelEmpty>
        )}
      </HomePanel>
    ),
    schedule: (handle: ReactNode) => (
      <HomePanel icon="calendar-day" title="Schedule" hint="today" onOpen={() => router.navigate("/workspace")} handle={handle}>
        {events.length ? (
          events.map((ev) => (
            <View key={ev.id} style={styles.entryRow}>
              <AppText variant="small" color={Palette.fgSubtle} style={styles.entryTime}>
                {ev.all_day ? "All day" : timeOf(ev.start_at)}
              </AppText>
              <AppText variant="body" numberOfLines={1} style={styles.entryBody}>
                {ev.title}
              </AppText>
            </View>
          ))
        ) : (
          <PanelEmpty>No events today</PanelEmpty>
        )}
      </HomePanel>
    ),
    reader: (handle: ReactNode) => (
      <HomePanel
        icon="newspaper"
        title="Reader"
        hint={unread > 0 ? `${unread} unread` : undefined}
        onOpen={() => router.navigate("/workspace")}
        handle={handle}
      >
        {articlesQ.isPending ? (
          <PanelEmpty>Loading…</PanelEmpty>
        ) : articles.length ? (
          articles.map((article) => (
            <Pressable
              key={article.id}
              accessibilityRole="button"
              accessibilityLabel={`Open article: ${article.title}`}
              onPress={() => router.push({ pathname: "/reader/[id]", params: { id: article.id } })}
              style={({ pressed }) => [styles.article, pressed ? styles.pressed : null]}
            >
              <AppText variant="body" numberOfLines={2} style={styles.articleTitle}>
                {article.title}
              </AppText>
              <AppText variant="small" color={Palette.fgSubtle} numberOfLines={1}>
                {article.feed_title} · {rssAge(article.published_at)}
              </AppText>
            </Pressable>
          ))
        ) : (
          <PanelEmpty>No articles yet. Add a feed in the Reader.</PanelEmpty>
        )}
      </HomePanel>
    ),
    health: (handle: ReactNode) => (
      <HomePanel icon="heart-pulse" title="Health" hint="today" onOpen={() => router.push("/health")} handle={handle}>
        {health && (health.steps !== null || health.sleep_minutes !== null) ? (
          <View style={styles.stats}>
            <View style={styles.stat}>
              <AppText variant="small" color={Palette.fgSubtle}>
                Steps
              </AppText>
              <AppText variant="heading" style={styles.statValue}>
                {(health.steps ?? 0).toLocaleString()}
              </AppText>
            </View>
            <View style={styles.stat}>
              <AppText variant="small" color={Palette.fgSubtle}>
                Sleep
              </AppText>
              <AppText variant="heading" style={styles.statValue}>
                {health.sleep_minutes ? fmtDuration(health.sleep_minutes) : "–"}
              </AppText>
            </View>
          </View>
        ) : (
          <PanelEmpty>Open Health to connect your phone and see steps and sleep.</PanelEmpty>
        )}
      </HomePanel>
    ),
    insights: (handle: ReactNode) => <PersonalityInsightsCard handle={handle} />,
  };

  const items = order.map((id) => ({ id, label: LABELS[id], node: sections[id] ?? null }));
  // A wide screen splits the sections into the two columns of the web Home; each column keeps its own order and drags within itself.
  const inColumn = (column: readonly string[]) => items.filter((item) => column.includes(item.id));
  const main = inColumn(HOME_COLUMNS.main);
  const side = inColumn(HOME_COLUMNS.side);

  return (
    <Screen onRefresh={refresh} refreshing={refreshing} wide>
      {header}
      {quick}

      {layout.columns === 2 ? (
        <View style={styles.columns}>
          <View style={styles.mainColumn}>
            <ReorderableList gap={Space.lg} onReorder={(ids) => saveOrder([...ids, ...side.map((item) => item.id)])} items={main} />
          </View>
          <View style={styles.sideColumn}>
            <ReorderableList gap={Space.lg} onReorder={(ids) => saveOrder([...main.map((item) => item.id), ...ids])} items={side} />
          </View>
        </View>
      ) : (
        <ReorderableList gap={Space.lg} onReorder={saveOrder} items={items} />
      )}
    </Screen>
  );
}

function noteTitle(note: Note) {
  return (
    note.title.trim() ||
    note.body
      .split("\n")
      .find((line) => line.trim())
      ?.replace(/^[#>*\-\s]+/, "")
      .slice(0, 80) ||
    "Untitled"
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: Space.md, paddingTop: Space.xs },
  headerText: { flex: 1, gap: Space.xs },
  dateRow: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  planBadge: { backgroundColor: Tints.green.bg, borderColor: Tints.green.line, borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  planText: { fontSize: 10, lineHeight: 13 },
  greeting: { fontSize: 34, lineHeight: 38, letterSpacing: -1 },
  name: { ...Font.serifItalic, color: Palette.greenFg, fontSize: 34, lineHeight: 38, letterSpacing: -1 },
  quickScroll: { flexGrow: 0 },
  quick: { gap: Space.sm },
  pill: {
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: Palette.glassHi,
    borderWidth: 1,
    borderColor: Palette.glassRing,
  },
  todayCard: { padding: Space.lg + 2, gap: Space.md },
  todayHead: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  todayTitle: { flex: 1, fontSize: 28, lineHeight: 32 },
  todayCount: { fontVariant: ["tabular-nums"] },
  progress: { height: 4, borderRadius: Radius.pill, backgroundColor: Palette.line, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: Radius.pill, backgroundColor: Palette.greenFg },
  addRow: { height: 44, flexDirection: "row", alignItems: "center", gap: Space.sm, paddingHorizontal: Space.lg, borderRadius: Radius.pill, backgroundColor: Palette.surfaceMuted },
  addInput: { ...Font.sans, flex: 1, height: "100%", fontSize: 15, color: Palette.fg },
  entryRow: { flexDirection: "row", alignItems: "baseline", gap: Space.md },
  entryTime: { width: 56, fontVariant: ["tabular-nums"] },
  entryBody: { flex: 1 },
  entryForm: { flexDirection: "row", alignItems: "flex-end", gap: Space.sm },
  entryInput: { ...Font.sans, flex: 1, minHeight: 44, maxHeight: 120, fontSize: 15, color: Palette.fg, paddingHorizontal: Space.lg, paddingVertical: 12, borderRadius: Radius.r2, backgroundColor: Palette.surfaceMuted },
  listRow: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Space.md },
  listTitle: { flex: 1 },
  article: { paddingVertical: Space.sm, gap: 2 },
  articleTitle: { lineHeight: 20 },
  stats: { flexDirection: "row", gap: Space.lg },
  stat: { flex: 1 },
  statValue: { fontSize: 28, lineHeight: 32 },
  streakRight: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    backgroundColor: Palette.fillDark,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: "100%", height: "100%", borderRadius: Radius.pill },
  bell: {
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Palette.glassHi,
    borderWidth: 1,
    borderColor: Palette.glassRing,
  },
  bellDot: { position: "absolute", top: Space.sm, right: Space.sm, width: Space.sm, height: Space.sm, borderRadius: Radius.pill, backgroundColor: Palette.rec },
  pressed: { opacity: 0.72 },
  streakCard: { gap: Space.md, padding: Space.lg },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Space.sm },
  streakSummary: { minHeight: 78, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Space.md },
  streakNumber: { flexDirection: "row", alignItems: "baseline", gap: Space.sm },
  streakValue: { fontSize: 58, lineHeight: 62 },
  streakHint: { maxWidth: "54%" },
  columns: { flexDirection: "row", alignItems: "flex-start", gap: Space.lg },
  mainColumn: { flex: 1.6 },
  sideColumn: { flex: 1 },
  week: { flexDirection: "row", gap: Space.sm },
  weekDay: {
    flex: 1,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.r1,
    backgroundColor: Palette.glassHi,
  },
  weekDayActive: { backgroundColor: Palette.greenFg },
  weekDayToday: { borderWidth: 1, borderColor: Palette.greenFg },
  weekLabel: { textTransform: "uppercase" },
  section: { gap: Space.lg },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: Space.md },
  sectionTitle: { fontSize: 18, lineHeight: 24 },
  sectionLink: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: Space.xs, paddingHorizontal: Space.xs },
  taskCard: { paddingHorizontal: Space.lg, paddingVertical: Space.sm, gap: 0 },
  notesHeading: { flexDirection: "row", alignItems: "baseline", gap: Space.md },
  notesCard: { paddingHorizontal: Space.lg, paddingVertical: Space.sm },
  noteRow: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: Space.md },
  noteBullet: { width: 8, height: 8, borderRadius: Radius.pill, backgroundColor: Tints.amber.fg },
  noteTitle: { flex: 1 },
  noteAge: { flexShrink: 0 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: Palette.line, marginLeft: 20 },
});
