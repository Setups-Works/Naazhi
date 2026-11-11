import type { Attachment } from "@untitled/types";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable } from "react-native";

import { AttachmentGallery } from "@/components/ui/AttachmentGallery";
import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Screen } from "@/components/ui/Screen";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { Palette, Space, themedStyles } from "@/constants/theme";
import { useJournal } from "@/features/journal/queries";
import { useNotes } from "@/features/notes/queries";

type Source = "all" | "notes" | "journal";
type Group = { key: string; source: Exclude<Source, "all">; label: string; added: string; files: Attachment[]; open: () => void };

/** Every file you attached to a note or a journal entry, in one place (the web Library, minus chat files). */
export function LibraryScreen() {
  const notesQ = useNotes();
  const journalQ = useJournal();
  const [source, setSource] = useState<Source>("all");

  const groups = useMemo<Group[]>(() => {
    const out: Group[] = [];
    for (const n of notesQ.data ?? [])
      if (n.attachments?.length)
        out.push({ key: `n${n.id}`, source: "notes", label: `Note · ${n.title || "Untitled"}`, added: n.updated_at, files: n.attachments, open: () => router.push(`/note/${n.id}`) });
    for (const j of journalQ.data ?? [])
      if (j.attachments?.length)
        out.push({ key: `j${j.id}`, source: "journal", label: `Journal · ${j.entry_date}`, added: j.created_at, files: j.attachments, open: () => router.push(`/journal/${j.id}`) });
    return out.sort((a, b) => b.added.localeCompare(a.added));
  }, [notesQ.data, journalQ.data]);

  const shown = source === "all" ? groups : groups.filter((g) => g.source === source);
  const total = shown.reduce((n, g) => n + g.files.length, 0);
  const loading = notesQ.isLoading || journalQ.isLoading;
  const failed = notesQ.isError || journalQ.isError;
  const refresh = () => {
    void notesQ.refetch();
    void journalQ.refetch();
  };

  return (
    <Screen onRefresh={refresh} refreshing={notesQ.isRefetching || journalQ.isRefetching}>
      <PageHeader title="Library" subtitle={loading ? "Loading your files…" : `${total} ${total === 1 ? "file" : "files"}`} />
      <Segmented
        value={source}
        onChange={setSource}
        options={[
          { key: "all", label: "All" },
          { key: "notes", label: "Notes" },
          { key: "journal", label: "Journal" },
        ]}
      />
      {loading ? (
        <LoadingState />
      ) : failed ? (
        <ErrorState message="Check your connection and try again." onRetry={refresh} />
      ) : shown.length === 0 ? (
        <EmptyState icon="layer-group" title="No files yet" hint="Pictures, voice notes and documents you attach to notes and journal entries show up here." />
      ) : (
        shown.map((g) => (
          <Card key={g.key}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Open ${g.label}`} onPress={g.open} style={styles.cardHead}>
              <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                {g.label}
              </AppText>
              <Icon name="chevron-right" size={12} color={Palette.fgFaint} />
            </Pressable>
            <AttachmentGallery attachments={g.files} />
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: Space.sm, paddingBottom: Space.md },
}));
