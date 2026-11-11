import type { SharedJournalEntry } from "@untitled/types";
import { useState } from "react";
import { Pressable } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { Palette, themedStyles } from "@/constants/theme";
import { FeedEntry } from "@/features/journal/FeedEntry";

/** One entry in a shared journal, drawn exactly like an entry in your own Journal, with who wrote it. Edit and Delete are in the ⋯ menu. */
export function EntryCard({
  entry,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  entry: SharedJournalEntry;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const choose = (run: () => void) => () => {
    setOpen(false);
    run();
  };
  return (
    <>
      <FeedEntry entry={entry} author={entry.author} onMenu={canEdit || canDelete ? () => setOpen(true) : undefined} />
      <Sheet visible={open} onClose={() => setOpen(false)} title="Entry">
        {canEdit ? (
          <Pressable accessibilityRole="button" style={styles.row} onPress={choose(onEdit)}>
            <AppText variant="body">Edit</AppText>
            <Icon name="pen" size={15} color={Palette.fgMuted} />
          </Pressable>
        ) : null}
        {canDelete ? (
          <Pressable accessibilityRole="button" style={styles.row} onPress={choose(onDelete)}>
            <AppText variant="body" color={Palette.clayFg}>
              Delete
            </AppText>
            <Icon name="trash-can" size={15} color={Palette.clayFg} />
          </Pressable>
        ) : null}
      </Sheet>
    </>
  );
}

const styles = themedStyles(() => ({
  row: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
}));
