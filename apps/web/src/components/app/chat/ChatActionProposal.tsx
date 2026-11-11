"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Icon as FA } from "@/components/ui/Icon";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faBookOpen, faListCheck, faPenToSquare, faRss } from "@fortawesome/free-solid-svg-icons";
import { stripRefs, type ChatAction, type ChatProposal } from "../../../lib/chat-actions";
import { qk } from "../../../lib/query/keys";
import { draftDue, recurrenceLabel } from "../../../lib/tasks";

const TONE: Record<ChatAction["kind"], string> = { journal: "violet", task: "amber", note: "blue", feed: "sand" };
const ICON: Record<ChatAction["kind"], IconDefinition> = { journal: faBookOpen, task: faListCheck, note: faPenToSquare, feed: faRss };
const LABEL: Record<ChatAction["kind"], string> = { task: "to-do", journal: "journal entry", note: "note", feed: "feed" };
const WHERE: Record<ChatAction["kind"], string> = { task: "To-do", journal: "Journal", note: "Notes", feed: "Reader" };

const dateLabel = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

/**
 * The drafts the assistant prepared from one message (a journal entry, to-dos, notes…). Nothing is saved until the person
 * presses Create on a draft, or "Create all". Created drafts turn into links to the saved item.
 */
export default function ChatActionProposal({
  proposals,
  messageId,
  chatId,
}: {
  proposals: ChatProposal[];
  messageId: string;
  chatId: string;
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<number | "all" | null>(null);
  const [error, setError] = useState("");
  const pending = proposals.filter((p) => !p.created);

  async function create(which: number | "all") {
    setBusy(which);
    setError("");
    try {
      const res = await fetch("/api/v1/ai/actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messageId, which }),
      });
      const out = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(out?.error ?? "Couldn’t create that item.");
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.chats.messages(chatId) }),
        qc.invalidateQueries({ queryKey: qk.notes.all }),
        qc.invalidateQueries({ queryKey: qk.tasks.all }),
        qc.invalidateQueries({ queryKey: qk.journal.all }),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t create that item.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2" role="group" aria-label="Drafts to review">
      {proposals.map((p) => {
        const a = p.action;
        const preview = a.kind === "task" ? a.description : a.kind === "journal" ? stripRefs(a.body) : a.kind === "feed" ? a.url : a.body;
        return (
          <section
            key={p.index}
            className="rounded-r3 border bg-raised p-4 text-ink"
            aria-label={`${LABEL[a.kind]} draft`}
          >
            <p className="m-0 flex items-center gap-2 text-[13px] font-medium text-ink-2">
              <span className="grid size-7 place-items-center rounded-ctl bg-hover text-[12px] text-ink-2">
                <FA icon={ICON[a.kind]} />
              </span>
              {p.created ? `Saved to ${WHERE[a.kind]}` : `${WHERE[a.kind]} · draft`}
            </p>
            {a.kind !== "journal" && <p className="mt-2 font-semibold">{a.title}</p>}
            {preview && <p className="mt-1 line-clamp-6 whitespace-pre-wrap break-words text-sm text-fg-muted">{preview}</p>}
            {a.kind === "task" && (
              <>
                <p className="mt-2 block w-fit rounded-pill bg-hover px-2.5 py-0.5 text-[12.5px] text-ink-2">
                  {(() => {
                    const due = draftDue(a.due_date, a.recurrence ?? null);
                    return due ? `${a.recurrence ? "Starts" : "Due"} ${dateLabel(due)}` : "No due date";
                  })()}
                </p>
                {a.recurrence && (
                  <p className="mt-1.5 block w-fit rounded-pill bg-hover px-2.5 py-0.5 text-[12.5px] text-ink-2">
                    ↻ {recurrenceLabel(a.recurrence)}
                  </p>
                )}
              </>
            )}
            {a.kind === "journal" && (
              <p className="mt-2 block w-fit rounded-pill bg-hover px-2.5 py-0.5 text-[12.5px] text-ink-2">For {dateLabel(a.entry_date)}</p>
            )}
            {p.created ? (
              <a className="btn btn-secondary btn-sm mt-3 inline-flex h-9 px-4 text-[13px]" href={p.created.path}>
                Open {LABEL[a.kind]}
              </a>
            ) : (
              <button className="btn btn-primary btn-sm mt-3 h-9 px-4 text-[13px]" disabled={busy !== null} onClick={() => create(p.index)}>
                {busy === p.index ? "Creating…" : `Create ${LABEL[a.kind]}`}
              </button>
            )}
          </section>
        );
      })}
      {pending.length > 1 && (
        <button className="btn btn-primary self-start" disabled={busy !== null} onClick={() => create("all")}>
          {busy === "all" ? "Creating…" : `Create all ${pending.length}`}
        </button>
      )}
      {error && (
        <p className="text-sm text-critical" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
