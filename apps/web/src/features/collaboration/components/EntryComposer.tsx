"use client";
import { MAX_UPLOAD_BYTES, SHARED_JOURNAL as LIMIT } from "@untitled/logic";
import { useRef, useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faArrowUp, faPaperclip } from "@fortawesome/free-solid-svg-icons";
import { fmtTime } from "../../../lib/prefs";
import { useRecorder } from "../../../components/app/useRecorder";
import FilePreviewList from "../../../components/ui/FilePreviewList";
import RecordButton from "../../../components/ui/RecordButton";
import { useDraftFiles, useDraftText } from "../../../hooks/useDraft";

/**
 * Where a person writes a new entry: text, files and voice, like the personal journal. Unsent text and files are kept per `draftKey`
 * (a journal and a day), so a refresh or a change of day doesn't lose them. Resolves to true when the entry was saved, so the box clears.
 */
export default function EntryComposer({
  onSend,
  draftKey,
  showTime = true,
}: {
  onSend: (body: string, files: File[]) => Promise<boolean>;
  draftKey: string;
  showTime?: boolean;
}) {
  const [text, setText] = useDraftText(draftKey);
  const [files, setFiles] = useDraftFiles(draftKey);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ta = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const canSend = (text.trim().length > 0 || files.length > 0) && !busy;
  const rec = useRecorder((blob, type, secs) => {
    const ext = type.includes("mp4") ? "m4a" : "webm";
    setFiles((f) => [...f, new File([blob], `voice-note-${secs}s.${ext}`, { type })].slice(0, LIMIT.attachmentsMax));
  }, setErr);

  function addFiles(list: FileList | null) {
    const picked = Array.from(list ?? []);
    const ok = picked.filter((f) => f.size <= MAX_UPLOAD_BYTES);
    setErr(ok.length < picked.length ? `Files can be up to ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` : "");
    setFiles((cur) => [...cur, ...ok].slice(0, LIMIT.attachmentsMax));
  }

  async function send() {
    if (!canSend) return;
    setBusy(true);
    if (await onSend(text.trim(), files)) {
      setText("");
      setFiles([]);
      if (ta.current) ta.current.style.height = "";
    }
    setBusy(false);
  }

  return (
    <form
      className="jr-compose"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <span className="jr-now" aria-hidden>
        {showTime ? fmtTime(new Date().toISOString()) : ""}
      </span>
      <FilePreviewList label="Attachments to add" files={files} onRemove={(i) => setFiles((cur) => cur.filter((_, j) => j !== i))} />
      <textarea
        ref={ta}
        value={text}
        rows={2}
        maxLength={LIMIT.bodyMax}
        placeholder="Write something for everyone here…"
        aria-label="New entry"
        onChange={(e) => {
          setText(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${Math.min(e.target.scrollHeight, 220)}px`;
        }}
        onKeyDown={(e) => {
          // Enter saves, Shift+Enter starts a new line (⌘/Ctrl+Enter still saves), like the personal journal.
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void send();
          }
        }}
      />
      {err && (
        <p className="form-err" role="alert">
          {err}
        </p>
      )}
      <div className="jr-bar">
        <button type="button" className="jr-pill" onClick={() => picker.current?.click()}>
          <FA icon={faPaperclip} /> Attach
        </button>
        <RecordButton variant="pill" recording={rec.recording} secs={rec.secs} onToggle={rec.toggle} />
        <input
          ref={picker}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <small className="jr-hint">Enter to save · Shift+Enter for a new line</small>
        <button className="jr-send" disabled={!canSend} aria-label="Add entry" title="Add entry (Enter)">
          <FA icon={faArrowUp} />
        </button>
      </div>
    </form>
  );
}
