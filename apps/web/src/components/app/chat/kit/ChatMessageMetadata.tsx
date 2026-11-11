import { fmtTime } from "../../../../lib/prefs";

/** The small line under a message: the date and time it was sent, in the person's time format. */
export default function ChatMessageMetadata({ at }: { at: string }) {
  const day = new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return <small>{`${day}, ${fmtTime(at)}`}</small>;
}
