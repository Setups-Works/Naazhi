"use client";
import { useRef } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faPaperclip } from "@fortawesome/free-solid-svg-icons";
import type { Provider } from "../../../lib/ai";
import ModelPicker from "./ModelPicker";
import FilePreviewList from "../../ui/FilePreviewList";
import {
  ChatComposer,
  ChatComposerDrawer,
  ChatComposerInput,
  ChatComposerToolbar,
  ChatComposerTokenElement,
  ChatDictationButton,
  ChatSendButton,
} from "./kit";
import { useRecorder } from "../useRecorder";
import { useDraftFiles, useDraftText } from "../../../hooks/useDraft";
import { clearDraft } from "../../../lib/drafts";
import { useSkills } from "../../../features/settings/useSkills";

const MAX_BYTES = 10 * 1024 * 1024;

export default function Composer({
  busy,
  providers,
  provider,
  onProvider,
  onSend,
  onError,
  autoFocus,
  draftKey,
  starter = false,
}: {
  busy: boolean;
  /** Every AI choice (the server decides which are available). */
  providers: Provider[];
  /** Id of the selected provider. */
  provider: string;
  onProvider: (id: string) => void;
  /** Send the message. Call `saved()` as soon as it is stored so the input can be emptied; resolve false if sending failed. */
  onSend: (text: string, files: File[], saved: () => void) => Promise<boolean>;
  onError: (m: string) => void;
  autoFocus?: boolean;
  /** Where the unsent message, attachments and voice recordings are kept so a refresh doesn't lose them (one per chat). */
  draftKey: string;
  /** The text was put there by a starter chip, so it is not announced as a restored draft. */
  starter?: boolean;
}) {
  const [text, setText, restored] = useDraftText(draftKey);
  const [files, setFiles] = useDraftFiles(draftKey);
  // Typing "/" at the start lists the person's saved prompts (Settings → Skills); picking one puts its prompt in the box.
  const { skills } = useSkills();
  const slash = /^\/([a-z0-9-]*)$/i.exec(text);
  const skillMatches = slash ? skills.filter((s) => s.name.startsWith(slash[1].toLowerCase())) : [];
  const ta = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const current = providers.find((p) => p.id === provider) ?? providers[0];

  const rec = useRecorder((blob, type, secs) => {
    setFiles((f) => [...f, new File([blob], `voice-note-${secs}s.${type.includes("mp4") ? "m4a" : "webm"}`, { type })]);
  }, onError);

  const addFiles = (list: FileList | null) => {
    const picked = Array.from(list ?? []);
    const ok = picked.filter((f) => f.size <= MAX_BYTES);
    if (ok.length < picked.length) onError("Files can be up to 10 MB.");
    setFiles((f) => [...f, ...ok]);
  };

  const canSend = (text.trim() || files.length) && !busy;
  /**
   * Called by the chat as soon as the message is saved. The input is emptied then (not after the AI has answered), and the
   * saved draft is erased explicitly: sending the first message of a new chat swaps this input for a new one, so a draft
   * left behind would reappear in the next new chat.
   */
  function sent() {
    void clearDraft(draftKey);
    setText("");
    setFiles([]);
    if (ta.current) ta.current.style.height = "";
  }

  async function submit() {
    if (!canSend) return;
    const done = await onSend(text.trim(), files, sent);
    if (done) sent();
  }

  return (
    <ChatComposer onSubmit={submit}>
      <ChatComposerDrawer>
        <FilePreviewList files={files} onRemove={(i) => setFiles((x) => x.filter((_, j) => j !== i))} />
        {slash && (
          <ul className="cx-slash" aria-label="Skills">
            {skillMatches.length === 0 ? (
              <li className="cx-slash-none">{skills.length === 0 ? "No skills yet. Add one in Settings → Skills." : "No skill with that name."}</li>
            ) : (
              skillMatches.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setText(s.prompt);
                      ta.current?.focus();
                    }}
                  >
                    <b className="font-mono">/{s.name}</b>
                    <small>{s.description || s.prompt.slice(0, 70)}</small>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
        {restored && !starter && (
          <p className="m-0 flex items-center gap-2 text-[12.5px] text-fg-subtle" role="status">
            <ChatComposerTokenElement onRemove={sent} removeLabel="Discard the restored draft">
              Restored your unsent draft
            </ChatComposerTokenElement>
          </p>
        )}
      </ChatComposerDrawer>
      <ChatComposerInput ref={ta} value={text} onChange={setText} onSubmit={submit} autoFocus={autoFocus} />
      <ChatComposerToolbar>
        <button type="button" className="ne-btn" aria-label="Attach files" onClick={() => picker.current?.click()}>
          <FA icon={faPaperclip} />
        </button>
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
        <ModelPicker providers={providers} current={current} onSelect={onProvider} />
        <span className="cx-spacer" />
        <ChatDictationButton recording={rec.recording} secs={rec.secs} onToggle={rec.toggle} />
        <ChatSendButton disabled={!canSend} />
      </ChatComposerToolbar>
    </ChatComposer>
  );
}
