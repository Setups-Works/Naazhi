import { openWeb } from "@/lib/webSheet";

import { AppText } from "@/components/ui/AppText";
import { Palette } from "@/constants/theme";

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;
// "@Zoho Books" and the like: shown in bold, so it reads as the app the message points at.
const MENTION_RE = /(@Zoho (?:CRM|Mail|Calendar|Cliq|WorkDrive|Projects|Sign|Books|Billing|Expense|Desk|People|Recruit))/;
const TRAILING = /[).,;:!?]+$/;

/** A person's plain message with its web addresses turned into links that open in the browser. Everything else stays text. */
export function ChatTokenizedText({ text, color = Palette.onDark }: { text: string; color?: string }) {
  return (
    <AppText variant="body" color={color} selectable>
      {text.split(URL_RE).map((part, i) => {
        if (i % 2 === 0)
          return part.split(MENTION_RE).map((piece, j) =>
            j % 2 === 1 ? (
              <AppText key={`${i}-${j}`} variant="bodyStrong" color={color}>
                {piece}
              </AppText>
            ) : (
              piece
            ),
          );
        const tail = TRAILING.exec(part)?.[0] ?? "";
        const url = tail ? part.slice(0, -tail.length) : part;
        return (
          <AppText key={i} variant="body" color={color}>
            <AppText
              variant="body"
              color={color}
              accessibilityRole="link"
              style={{ textDecorationLine: "underline" }}
              onPress={() => openWeb(url)}
            >
              {url}
            </AppText>
            {tail}
          </AppText>
        );
      })}
    </AppText>
  );
}
