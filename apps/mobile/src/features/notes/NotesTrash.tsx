import { useEffect, useRef } from "react";
import { View } from "react-native";

import { TRASH_DAYS, useTrashActions, useTrashedNotes, type TrashedNote } from "./queries";
import { AppText } from "@/components/ui/AppText";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/Confirm";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { Palette, Radius, Space, themedStyles } from "@/constants/theme";
import { errorMessage } from "@/lib/api";
import { toDate } from "@untitled/logic";

const DAY = 86_400_000;
const titleOf = (n: TrashedNote) => n.title.trim() || n.body.trim().split("\n")[0]?.slice(0, 60) || "Untitled";
const daysLeft = (n: TrashedNote) => Math.max(0, TRASH_DAYS - Math.floor((Date.now() - +toDate(n.deleted_at)) / DAY));

/** The Trash: notes you deleted wait here for 30 days, then go for good. Restore one, delete it now, or empty the lot. */
export function NotesTrash() {
  const q = useTrashedNotes();
  const { restore, erase } = useTrashActions();
  const { ask, dialog } = useConfirm();
  const notes = q.data ?? [];
  const error = restore.error ?? erase.error;

  // Notes that have sat in the Trash for 30 days are cleared out the next time it is opened.
  const purged = useRef(false);
  useEffect(() => {
    if (purged.current || !q.data) return;
    purged.current = true;
    const old = q.data.filter((n) => Date.now() - +toDate(n.deleted_at) > TRASH_DAYS * DAY);
    if (old.length) erase.mutate(old);
  }, [q.data, erase]);

  async function forever(n: TrashedNote) {
    if (await ask({ title: "Delete this note forever?", body: `“${titleOf(n)}” and its attachments will be permanently deleted. This can’t be undone.`, confirmLabel: "Delete forever", danger: true })) erase.mutate([n]);
  }
  async function empty() {
    if (!notes.length) return;
    if (await ask({ title: "Empty the Trash?", body: `${notes.length === 1 ? "1 note" : `${notes.length} notes`} and their attachments will be permanently deleted. This can’t be undone.`, confirmLabel: "Empty Trash", danger: true })) erase.mutate(notes);
  }

  if (q.isPending) return <LoadingState />;
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;

  return (
    <View style={styles.wrap}>
      {dialog}
      <View style={styles.bar}>
        <AppText variant="small" color={Palette.fgSubtle} style={styles.flex}>
          Notes in the Trash are deleted for good after {TRASH_DAYS} days.
        </AppText>
        <Button title="Empty Trash" kind="secondary" disabled={!notes.length || erase.isPending} onPress={() => void empty()} style={styles.small} />
      </View>
      {error ? <Banner kind="error">{errorMessage(error, "Couldn’t do that. Try again.")}</Banner> : null}
      {notes.length === 0 ? (
        <EmptyState icon="trash" title="The Trash is empty" hint="Notes you delete show up here, and you can restore them." />
      ) : (
        <View style={styles.rows}>
          {notes.map((n, i) => (
            <View key={n.id} style={[styles.row, i > 0 ? styles.line : null]}>
              <View style={styles.flex}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {titleOf(n)}
                </AppText>
                <AppText variant="small" color={Palette.fgSubtle}>
                  Deleted {toDate(n.deleted_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {daysLeft(n)} {daysLeft(n) === 1 ? "day" : "days"} left
                </AppText>
              </View>
              <Button title="Restore" kind="secondary" icon="rotate-left" disabled={restore.isPending} onPress={() => restore.mutate([n.id])} style={styles.small} />
              <Button title="Delete" kind="ghost" disabled={erase.isPending} onPress={() => void forever(n)} style={styles.small} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: { gap: Space.md },
  flex: { flex: 1, gap: 2 },
  bar: { flexDirection: "row", alignItems: "center", gap: Space.md },
  small: { minHeight: 38, paddingHorizontal: 12 },
  rows: { borderWidth: 1, borderColor: Palette.line, borderRadius: Radius.r3, overflow: "hidden", backgroundColor: Palette.surface },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  line: { borderTopWidth: 1, borderTopColor: Palette.line },
}));
