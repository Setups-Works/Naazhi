"use client";
import { personName } from "@untitled/logic";
import { useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faPaperclip, faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import Markdown from "../../../components/app/Markdown";
import AttachmentImage from "../../../components/ui/AttachmentImage";
import AudioWave from "../../../components/ui/AudioWave";
import { fmtTime } from "../../../lib/prefs";
import type { SharedJournalEntry } from "../types";
import PersonAvatar from "./PersonAvatar";

/** One entry in a shared journal: who wrote it and when, its text and files, and edit / delete for the people allowed to. */
export default function EntryCard({
  entry,
  urls,
  canEdit,
  canDelete,
  onSave,
  onDelete,
}: {
  entry: SharedJournalEntry;
  urls: Record<string, string>;
  canEdit: boolean;
  canDelete: boolean;
  onSave: (body: string) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.body);

  async function save() {
    if (await onSave(draft.trim())) setEditing(false);
  }

  return (
    <article className="jr-row">
      <div className="jr-row-t">
        <time dateTime={entry.created_at}>{fmtTime(entry.created_at)}</time>
      </div>
      <div className="jr-row-b">
      <span className="mb-1 flex min-w-0 items-center gap-2">
        <PersonAvatar person={entry.author} size="sm" />
        <b className="truncate text-[13.5px] font-medium text-ink-2">{personName(entry.author)}</b>
      </span>

      {editing ? (
        <div className="jr-edit">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Edit entry"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void save();
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
              Cancel
            </button>{" "}
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void save()}>
              Save
            </button>
          </div>
        </div>
      ) : (
        entry.body && (
          <div className="jr-row-text">
            <Markdown text={entry.body} />
          </div>
        )
      )}

      {entry.attachments.length > 0 && (
        <ul className="jr-files">
          {entry.attachments.map((a) => {
            const url = urls[a.path];
            const image = a.type.startsWith("image/");
            const audio = a.type.startsWith("audio/");
            return (
              <li key={a.path}>
                {url && image && <AttachmentImage src={url} name={a.name} />}
                {url && audio && <AudioWave src={url} label={a.name} />}
                {!image &&
                  !audio &&
                  (url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <FA icon={faPaperclip} /> {a.name}
                    </a>
                  ) : (
                    <span>{a.name}</span>
                  ))}
              </li>
            );
          })}
        </ul>
      )}
      </div>
      <div className="jr-row-a">
        {canEdit && (
          <button
            type="button"
            className="ne-btn"
            aria-label="Edit entry"
            onClick={() => {
              setDraft(entry.body);
              setEditing(true);
            }}
          >
            <FA icon={faPen} />
          </button>
        )}
        {canDelete && (
          <button type="button" className="ne-btn" aria-label="Delete entry" onClick={onDelete}>
            <FA icon={faTrash} />
          </button>
        )}
      </div>
    </article>
  );
}
