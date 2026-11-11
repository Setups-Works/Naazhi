import type { Attachment, JournalPerson } from "@untitled/types";
import { personName } from "@untitled/logic";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { AttachmentGallery } from "@/components/ui/AttachmentGallery";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { PersonBadge } from "@/features/collaboration/components/PersonBadge";
import { Markdown } from "@/components/ui/Markdown";
import { Font, Palette, Radius, Space, themedStyles } from "@/constants/theme";
import { timeOf } from "@/lib/dates";

const words = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

/**
 * One entry in the day's feed, on a tinted glass card (its colour comes from the list, so neighbours differ, as on the web): the time in the display serif, a hairline that runs to the edge with the word
 * count, then the text in the serif and any pictures or voice notes. Tap the entry to open it; the menu has Edit and Delete.
 */
export function FeedEntry({ entry, author, onOpen, onMenu }: { entry: { created_at: string; body: string; attachments: Attachment[] }; author?: JournalPerson; onOpen?: () => void; onMenu?: () => void }) {
  const count = words(entry.body);
  return (
    <Card style={styles.entry}>
      <View style={styles.head}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open journal entry at ${timeOf(entry.created_at)}`}
          disabled={!onOpen}
          onPress={onOpen}
          style={styles.open}
        >
          <AppText style={styles.time}>{timeOf(entry.created_at)}</AppText>
          <View style={styles.rule} />
          {count ? (
            <AppText variant="small" color={Palette.fgFaint} style={styles.count}>
              {count} {count === 1 ? "word" : "words"}
            </AppText>
          ) : null}
        </Pressable>
        {onMenu ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Entry actions" hitSlop={8} onPress={onMenu} style={styles.menu}>
            <Icon name="ellipsis" size={16} color={Palette.fgSubtle} />
          </Pressable>
        ) : null}
      </View>
      {author ? (
        <View style={styles.author}>
          <PersonBadge person={author} size="sm" />
          <AppText variant="small" color={Palette.fgMuted}>
            {personName(author)}
          </AppText>
        </View>
      ) : null}
      {entry.body ? (
        <Pressable accessibilityRole={onOpen ? "button" : "text"} accessibilityLabel="Open journal entry" disabled={!onOpen} onPress={onOpen}>
          <Markdown text={entry.body} serif />
        </Pressable>
      ) : null}
      <AttachmentGallery attachments={entry.attachments} />
    </Card>
  );
}

const styles = themedStyles(() => ({
  entry: { gap: Space.md, padding: Space.lg, borderRadius: Radius.r3 },
  head: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  open: { flex: 1, flexDirection: "row", alignItems: "center", gap: Space.md },
  time: { ...Font.serif, fontSize: 30, lineHeight: 34, letterSpacing: -0.5, color: Palette.fg },
  rule: { flex: 1, height: StyleSheet.hairlineWidth * 2, backgroundColor: Palette.lineStrong },
  count: { ...Font.mono },
  author: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: -Space.xs },
  menu: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
}));
