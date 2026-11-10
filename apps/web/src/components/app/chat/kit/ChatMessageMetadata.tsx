import { fmtTime } from "../../../../lib/prefs";

/** The small line under a message: when it was sent, in the person's time format. */
export default function ChatMessageMetadata({ at }: { at: string }) {
  return <small>{fmtTime(at)}</small>;
}
