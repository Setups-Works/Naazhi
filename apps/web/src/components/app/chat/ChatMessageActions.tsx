"use client";
import { useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faCheck, faCopy, faNoteSticky } from "@fortawesome/free-solid-svg-icons";

/** Small icon buttons under a reply: copy it, or keep it as a note. */
export default function ChatMessageActions({ text, onSaveNote }: { text: string; onSaveNote: (text: string) => Promise<boolean> }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }
  async function save() {
    if (await onSaveNote(text)) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <span className="cx-acts" role="group" aria-label="Reply actions">
      <button type="button" onClick={copy} aria-label={copied ? "Copied" : "Copy reply"} title="Copy">
        <FA icon={copied ? faCheck : faCopy} />
      </button>
      <button type="button" onClick={save} aria-label={saved ? "Saved to notes" : "Save to a note"} title={saved ? "Saved to Notes" : "Save to a note"}>
        <FA icon={saved ? faCheck : faNoteSticky} />
      </button>
    </span>
  );
}
