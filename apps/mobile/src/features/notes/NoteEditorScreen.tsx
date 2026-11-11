import { noteShareUrl, setNoteShared } from "@untitled/api-client";
import { ShareLinkSheet } from "@/components/ui/ShareLinkSheet";
import { mobileEnv } from "@/config/env";
import { dbQuery } from "@/features/chat/db";
import { toDate } from "@untitled/logic";
import type { Note } from "@untitled/types";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { NoteForm } from "./NoteForm";
import { useNote } from "./queries";
import { AppText } from "@/components/ui/AppText";
import { AttachmentGallery } from "@/components/ui/AttachmentGallery";
import { BarButton, DetailBar } from "@/components/ui/DetailBar";
import { Icon } from "@/components/ui/Icon";
import { Markdown } from "@/components/ui/Markdown";
import { Screen } from "@/components/ui/Screen";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { Palette, Radius, Tints, themedStyles } from "@/constants/theme";
import { api, errorMessage } from "@/lib/api";

export function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const noteQ = useNote(id);
  if (id === "new") return <NoteForm id="new" />;
  if (noteQ.isError)
    return (
      <Screen>
        <ErrorState message={errorMessage(noteQ.error)} onRetry={() => void noteQ.refetch()} />
      </Screen>
    );
  if (!noteQ.data)
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  return <NoteScreen note={noteQ.data} />;
}

/** An existing note opens as a rendered page; the writing page only appears after tapping Edit, and saving returns to the page. */
function NoteScreen({ note }: { note: Note }) {
  const [editing, setEditing] = useState(false);
  // Mounting the form only when editing starts lets it begin from the latest saved values without syncing state in an effect.
  if (editing) return <NoteForm id={note.id} note={note} onSaved={() => setEditing(false)} onCancel={() => setEditing(false)} />;
  return <NoteView note={note} onEdit={() => setEditing(true)} />;
}

function NoteView({ note, onEdit }: { note: Note; onEdit: () => void }) {
  const tint = note.color ? Tints[note.color] : null;
  const [sharing, setSharing] = useState(false);
  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <DetailBar label="Note" onClose={() => router.back()} action={
          <View style={styles.actions}>
            <BarButton title="Share" onPress={() => setSharing(true)} />
            <BarButton title="Edit" onPress={onEdit} />
          </View>
        }
      />
      <View style={[styles.page, tint ? { backgroundColor: tint.bg, borderColor: tint.line } : null]}>
        <View style={styles.titleRow}>
          <AppText variant="title" style={styles.flex}>
            {note.title || "Untitled"}
          </AppText>
          {note.pinned ? <Icon name="thumbtack" size={14} color={tint?.fg ?? Palette.fgSubtle} /> : null}
        </View>
        <AppText variant="small" color={Palette.fgSubtle}>
          Updated {toDate(note.updated_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
        </AppText>
        {note.body ? <Markdown text={note.body} /> : null}
        <AttachmentGallery attachments={note.attachments} />
      </View>
      {sharing ? (
        <ShareLinkSheet
          title="Share note"
          noun="this note"
          detail={`It shows “${note.title.trim() || "Untitled"}” without your name, and you can switch it off at any time.`}
          load={async () => (await dbQuery<{ share_token: string | null }[]>({ table: "notes", op: "select", columns: "share_token", filters: [{ column: "id", op: "eq", value: note.id }] }))?.[0]?.share_token ?? null}
          toggle={(on) => setNoteShared(api, note.id, on)}
          urlFor={(t) => noteShareUrl(mobileEnv.apiBaseUrl ?? "", t)}
          onClose={() => setSharing(false)}
        />
      ) : null}
    </Screen>
  );
}

const styles = themedStyles(() => ({
  page: { gap: 12, padding: 4, borderRadius: Radius.r3 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  flex: { flex: 1 },
  actions: { flexDirection: "row", alignItems: "center", gap: 14 },
}));
