import { AppText } from "@/components/ui/AppText";
import { Palette } from "@/constants/theme";
import { timeOf } from "@/lib/dates";

/** The small line under a message: when it was sent. */
export function ChatMessageMetadata({ at, mine }: { at: string; mine: boolean }) {
  return (
    <AppText variant="small" color={mine ? Palette.onDark : Palette.fgSubtle} style={{ fontSize: 11.5, lineHeight: 15, opacity: mine ? 0.6 : 1 }}>
      {timeOf(at)}
    </AppText>
  );
}
