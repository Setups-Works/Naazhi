import AsyncStorage from "@react-native-async-storage/async-storage";
import { canWrite, MAX_UPLOAD_BYTES, SHARED_JOURNAL as LIMIT } from "@untitled/logic";
import type { SharedJournalEntry } from "@untitled/types";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";

import { useCollaborationActions, useJournalDay, useJournalDays, useSharedJournal } from "./queries";
import { EntryCard } from "./components/EntryCard";
import { EntryEditSheet } from "./components/EntryEditSheet";
import { ManageSheet } from "./components/ManageSheet";
import { RolePill } from "./components/RolePill";
import { uploadSharedJournalFile } from "./files";
import { AppText } from "@/components/ui/AppText";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CalendarGrid } from "@/components/ui/DatePicker";
import { DayNav } from "@/components/ui/DayNav";
import { DetailBar } from "@/components/ui/DetailBar";
import { EntryEditor } from "@/components/ui/EntryEditor";
import { PageHeader } from "@/components/ui/PageHeader";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useConfirm } from "@/components/ui/Confirm";
import { pickFiles, type PendingFile } from "@/features/chat/files";
import { useRecorder } from "@/features/chat/useRecorder";
import { readPendingFiles } from "@/features/journal/draftFiles";
import { Font, Palette, Radius, Space, themedStyles } from "@/constants/theme";
import { errorMessage } from "@/lib/api";
import { addDays, dayLabel, isoDate, timeOf } from "@/lib/dates";

const parseDate = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number) as [number, number, number];
  return new Date(year, month - 1, day);
};

// Unsent text and files are kept on the phone per journal and day, as in the personal journal, so closing the app doesn't lose them.
const draftKey = (userId: string, journalId: string, date: string) => `shared-journal:draft:${userId}:${journalId}:${date}`;
const filesKey = (userId: string, journalId: string, date: string) => `shared-journal:files:${userId}:${journalId}:${date}`;

/**
 * A shared journal, laid out like the Journal: the day and how many entries it holds, a day switcher with a calendar (days with writing
 * are marked), that day's entries, and the same writing page with files and voice. Everyone in the journal writes here, so each entry
 * names its author, and viewers can read but not write.
 */
export function SharedJournalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = isoDate();
  const [date, setDate] = useState(today);
  const journalQ = useSharedJournal(id);
  const dayQ = useJournalDay(id, date);
  const daysQ = useJournalDays(id);
  const act = useCollaborationActions();
  const { ask, dialog } = useConfirm();
  const [err, setErr] = useState("");
  const [people, setPeople] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<SharedJournalEntry | null>(null);
  const [draftLoadedFor, setDraftLoadedFor] = useState("");
  const rec = useRecorder((file) => setFiles((cur) => [...cur, file].slice(0, LIMIT.attachmentsMax)), setErr);

  const journal = journalQ.data;
  const me = journal?.me;
  const entries = dayQ.data ?? [];
  const writer = journal ? canWrite(journal.role) : false;
  const owner = journal?.role === "owner";
  const markedDays = useMemo(() => new Set((daysQ.data ?? []).map((d) => d.date)), [daysQ.data]);
  const activeKey = me ? draftKey(me, id, date) : "";
  const loadingDraft = !!activeKey && draftLoadedFor !== activeKey;

  // Read the unsent draft of the open day, and keep saving it as it changes.
  useEffect(() => {
    if (!me) return;
    let live = true;
    void Promise.all([AsyncStorage.getItem(draftKey(me, id, date)), AsyncStorage.getItem(filesKey(me, id, date))])
      .then(([text, pending]) => {
        if (!live) return;
        setDraft(text ?? "");
        setFiles(readPendingFiles(pending));
        setDraftLoadedFor(draftKey(me, id, date));
      })
      .catch(() => {
        if (!live) return;
        setDraft("");
        setFiles([]);
        setDraftLoadedFor(draftKey(me, id, date));
      });
    return () => {
      live = false;
    };
  }, [date, id, me]);
  useEffect(() => {
    if (!me || loadingDraft || draftLoadedFor !== draftKey(me, id, date)) return;
    void AsyncStorage.multiSet([
      [draftKey(me, id, date), draft],
      [filesKey(me, id, date), JSON.stringify(files)],
    ]).catch(() => undefined);
  }, [date, draft, draftLoadedFor, files, id, loadingDraft, me]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([journalQ.refetch(), dayQ.refetch(), daysQ.refetch()]);
    setRefreshing(false);
  }, [dayQ, daysQ, journalQ]);

  async function attach(type?: string) {
    try {
      const { files: picked, tooBig } = await pickFiles(type);
      setErr(tooBig ? `Files can be up to ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` : "");
      setFiles((cur) => [...cur, ...picked].slice(0, LIMIT.attachmentsMax));
    } catch (e) {
      setErr(errorMessage(e, "Couldn’t open your files."));
    }
  }

  async function send() {
    if (!journal) return;
    setErr("");
    setSaving(true);
    try {
      const body = draft.trim();
      const attachments = await Promise.all(files.map((f) => uploadSharedJournalFile(journal.me, id, f)));
      const voiceOnly = !body && attachments.every((a) => a.type.startsWith("audio/"));
      await act.addEntry.mutateAsync({ id, entry: { entry_date: date, body, kind: voiceOnly ? "voice" : "text", attachments } });
      setDraft("");
      setFiles([]);
      setComposing(false);
    } catch (e) {
      setErr(errorMessage(e, "Couldn’t save that entry."));
    } finally {
      setSaving(false);
    }
  }

  async function remove(entryId: string, createdAt: string) {
    const yes = await ask({
      title: "Delete this entry?",
      body: `The entry from ${timeOf(createdAt)} and its attachments will be permanently deleted for everyone.`,
      confirmLabel: "Delete entry",
      danger: true,
    });
    if (yes) act.removeEntry.mutate({ id, entryId }, { onError: (e) => setErr(errorMessage(e, "Couldn’t delete that entry.")) });
  }

  if (journalQ.isError)
    return (
      <Screen edges={["top", "left", "right", "bottom"]}>
        <DetailBar label="Shared journal" closeLabel="Back" onClose={() => router.back()} />
        <ErrorState message={errorMessage(journalQ.error)} onRetry={() => void journalQ.refetch()} />
      </Screen>
    );

  const selected = parseDate(date);
  const title = selected.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(selected.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}),
  });
  const dayName = date === today ? "Today" : selected.toLocaleDateString(undefined, { weekday: "long" });
  const canSave = (draft.trim().length > 0 || files.length > 0) && !saving && !loadingDraft && !rec.recording;

  return (
    <Screen edges={["top", "left", "right", "bottom"]} onRefresh={() => void refresh()} refreshing={refreshing}>
      <PageHeader
        title={dayName}
        subtitle={dayQ.isPending ? " " : `${entries.length} ${entries.length === 1 ? "entry" : "entries"} · ${journal?.name ?? "Shared journal"}`}
        onBack={() => router.back()}
        backLabel="Journal"
        right={
          journal ? (
            <>
              <RolePill role={journal.role} />
              <Button title={owner ? "Manage" : "People"} kind="secondary" onPress={() => setPeople(true)} style={styles.small} />
              {writer ? <Button title="Add" icon="plus" onPress={() => setComposing(true)} style={styles.small} /> : null}
            </>
          ) : undefined
        }
      />

      <DayNav
        label={title}
        accessibilityLabel={`${title}. Choose date.`}
        nextDisabled={date >= today}
        onPrev={() => {
          setEditing(null);
          setDate((current) => addDays(current, -1));
        }}
        onNext={() => {
          setEditing(null);
          setDate((current) => addDays(current, 1));
        }}
        onOpen={() => setCalendarOpen(true)}
      />
      {err && !composing ? <Banner kind="error">{err}</Banner> : null}
      {!writer && journal ? <Banner kind="info">You can read this journal. Only editors and the owner can write in it.</Banner> : null}

      {journalQ.isPending || dayQ.isPending ? (
        <LoadingState label="Loading entries…" />
      ) : dayQ.isError ? (
        <ErrorState message={errorMessage(dayQ.error)} onRetry={() => void dayQ.refetch()} />
      ) : entries.length ? (
        <View style={styles.feed}>
          {entries.map((e) => {
            const mine = e.author.id === journal?.me;
            return (
              <EntryCard
                key={e.id}
                entry={e}
                canEdit={mine && writer}
                canDelete={(mine && writer) || owner}
                onEdit={() => setEditing(e)}
                onDelete={() => void remove(e.id, e.created_at)}
              />
            );
          })}
        </View>
      ) : (
        <Card onPress={writer ? () => setComposing(true) : undefined} accessibilityLabel={writer ? "Write an entry" : "No entries"} style={styles.empty}>
          <AppText style={styles.emptyText}>
            {writer ? (date === today ? "Nothing written yet today. What’s on your mind?" : "No entries on this day.") : "Nothing has been written on this day."}
          </AppText>
        </Card>
      )}

      <EntryEditor
        visible={composing}
        label={`${dayLabel(date, today)} · ${journal?.name ?? "Shared journal"}`}
        inputLabel="New entry"
        draft={draft}
        onDraft={setDraft}
        files={files}
        onRemoveFile={(i) => setFiles((cur) => cur.filter((_, j) => j !== i))}
        recording={rec.recording}
        recordingSecs={rec.secs}
        onToggleRecording={() => void rec.toggle()}
        onPickImages={() => void attach("image/*")}
        onPickFiles={() => void attach()}
        canSave={canSave}
        saving={saving}
        error={err}
        onSave={() => void send()}
        onClose={() => setComposing(false)}
      />
      {editing && journal ? <EntryEditSheet key={editing.id} journalId={id} userId={journal.me} entry={editing} onClose={() => setEditing(null)} /> : null}

      <Sheet visible={calendarOpen} onClose={() => setCalendarOpen(false)} title="Choose a day">
        <CalendarGrid
          value={date}
          onPick={(picked) => {
            setDate(picked);
            setCalendarOpen(false);
          }}
          marks={markedDays}
          maxDate={today}
        />
        <Button
          title="Today"
          kind="secondary"
          icon="calendar-day"
          onPress={() => {
            setDate(today);
            setCalendarOpen(false);
          }}
          style={styles.todayButton}
        />
      </Sheet>

      <ManageSheet id={people ? id : null} onClose={() => setPeople(false)} />
      {dialog}
    </Screen>
  );
}

const styles = themedStyles(() => ({
  small: { minHeight: 38, paddingHorizontal: 14 },
  feed: { gap: Space.md },
  empty: { padding: Space.xl, borderRadius: Radius.r3 },
  emptyText: { ...Font.serif, fontSize: 24, lineHeight: 32, color: Palette.fgSubtle },
  todayButton: { marginTop: 12 },
}));
