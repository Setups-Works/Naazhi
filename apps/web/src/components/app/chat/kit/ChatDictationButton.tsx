"use client";
import RecordButton from "../../../ui/RecordButton";

/** Voice input: a microphone that turns into a recording pill with a timer. The recording is attached to the message as audio. */
export default function ChatDictationButton({ recording, secs, onToggle }: { recording: boolean; secs: number; onToggle: () => void }) {
  return <RecordButton recording={recording} secs={secs} onToggle={onToggle} />;
}
